import { trackEvent } from "./analytics";
import { EXTENSION_NAME } from "./constants";
import { createElement, getBrowser } from "./dom";

export type HTMLElementWithValue = HTMLElement & { value: any };

export class LegacySetting {
    name: string;
    modified: boolean;
    default: any;
    control: HTMLDivElement;
    storageLocation: "local" | "sync" = "sync";

    onmodify?: (element: HTMLElementWithValue) => void;
    onsave: (setting: HTMLElementWithValue) => any;
    onload: (value: any, element?: HTMLElementWithValue) => any;
    onshown?: () => any;

    static settings: { [s: string]: LegacySetting } = {};
    static rawSyncStorage: { [s: string]: any } = {};
    static rawLocalStorage: { [s: string]: any } = {};

    public static updateSettingsFunction: () => Promise<void> = () => Promise.resolve();

    constructor(
        name: string,
        friendlyName: string,
        description: string,
        defaultValue: any,
        type: string,
        options: any,
        onload: (arg0: any, element?: HTMLElementWithValue) => any,
        onmodify: ((arg0: HTMLElementWithValue) => void) | undefined,
        onsave: (arg0: HTMLElementWithValue) => any,
        onshown?: () => any,
        storageLocation: "local" | "sync" = "sync"
    ) {
        this.name = name;
        this.onmodify = onmodify;
        this.onsave = onsave;
        this.onload = onload;
        this.onshown = onshown;
        this.modified = false;
        this.default = defaultValue;
        this.storageLocation = storageLocation;

        /**
         * Returns the element control to be used to edit the setting's value by the user
         * @returns {HTMLElement} A setting element
         */
        this.control = (() => {
            let setting = createElement("div", ["setting-entry"]);
            let title = createElement("h2", ["setting-title"], {
                textContent: friendlyName + ": ",
            });
            let helpText = createElement("p", ["setting-description"], { innerHTML: description });

            let controlElement: (HTMLElement & { value: any }) | null = null;

            switch (type) {
                case "number":
                case "text":
                case "button":
                    controlElement = createElement(
                        "input",
                        undefined,
                        Object.assign({ type: type }, options)
                    );
                    title.appendChild(controlElement);
                    if (type == "button")
                        controlElement.onclick = event =>
                            LegacySetting.onModify(event.target as HTMLElementWithValue);
                    else
                        controlElement.oninput = event =>
                            LegacySetting.onModify(event.target as HTMLElementWithValue);
                    break;
                case "select":
                    controlElement = createElement("select");
                    for (let option of options.options) {
                        controlElement.appendChild(
                            createElement("option", undefined, {
                                textContent: option.text,
                                value: option.value,
                            })
                        );
                    }
                    title.appendChild(controlElement);
                    controlElement.onchange = event =>
                        LegacySetting.onModify(event.target as HTMLElementWithValue);
                    break;
                case "custom":
                default:
                    controlElement = createElement("div") as any as HTMLElement & {
                        value: any;
                    };
                    title.appendChild(controlElement);
                    break;
            }

            setting.appendChild(title);
            setting.appendChild(helpText);

            controlElement.dataset.settingName = name;
            controlElement.id = `setting-input-${name}`;

            if (storageLocation === "local" && LegacySetting.rawLocalStorage[name] === undefined) {
                LegacySetting.rawLocalStorage[name] = defaultValue;
            } else if (
                storageLocation === "sync" &&
                LegacySetting.rawSyncStorage[name] === undefined
            ) {
                LegacySetting.rawSyncStorage[name] = defaultValue;
            }

            if (this.onload) {
                controlElement.value =
                    this.onload(this.getRawValue(), controlElement) || this.default;
            } else {
                controlElement.value = this.getRawValue() || this.default;
            }

            return setting;
        })();
        LegacySetting.settings[name] = this;
    }

    getRawValue() {
        return this.storageLocation === "sync"
            ? LegacySetting.rawSyncStorage[this.name]
            : LegacySetting.rawLocalStorage[this.name];
    }

    getElement() {
        return document.getElementById(`setting-input-${this.name}`) as HTMLElementWithValue;
    }

    /**
     * Saves modified settings to the Chrome Sync Storage
     * @param {Object.<string,any>} modifiedValues An object containing modified setting keys and values
     * @param {boolean} [updateButtonText=true] Change the value of the "Save Settings" button to "Saved!" temporarily
     * @param {boolean} [saveUiSettings=true] Whether or not to save modified settings from the UI as well as the passed dictionary.
     */
    static async saveModified(
        modifiedValuesSync?: { [s: string]: any },
        modifiedValuesLocal?: { [s: string]: any },
        updateButtonText: boolean = true,
        saveUiSettings: boolean = true
    ) {
        let newValuesSync: { [s: string]: any } = {};
        let newValuesLocal: { [s: string]: any } = {};
        if (modifiedValuesSync) {
            Object.assign(newValuesSync, modifiedValuesSync);
        }
        if (modifiedValuesLocal) {
            Object.assign(newValuesLocal, modifiedValuesLocal);
        }
        if (saveUiSettings) {
            for (let setting in LegacySetting.settings) {
                let v = LegacySetting.settings[setting];
                if (v.modified) {
                    let value = v.onsave(v.getElement());
                    if (v.storageLocation === "sync") {
                        newValuesSync[setting] = value;
                        LegacySetting.rawSyncStorage[setting] = value;
                    } else {
                        newValuesLocal[setting] = value;
                        LegacySetting.rawLocalStorage[setting] = value;
                    }
                    v.onload(value, v.getElement());
                    v.modified = false;
                }
            }
        }

        await chrome.storage.sync.set(newValuesSync);
        await chrome.storage.local.set(newValuesLocal);

        let newValuesAll = { ...newValuesSync, ...newValuesLocal };

        for (let settingName in newValuesAll) {
            let setting = LegacySetting.settings[settingName];
            if (!setting) {
                continue;
            }

            trackEvent("update_setting", {
                id: settingName,
                context: "Settings",
                value: newValuesAll[settingName],
                legacyTarget: settingName,
                legacyAction: `set value: ${newValuesAll[settingName]}`,
                legacyLabel: "Setting",
            });

            if (!setting.getElement()) {
                continue;
            }
            let settingModifiedIndicator = setting
                .getElement()
                .parentElement!.querySelector(".setting-modified");
            if (settingModifiedIndicator) {
                settingModifiedIndicator.remove();
            }
        }

        await LegacySetting.updateSettingsFunction();

        let settingsSaved = document.getElementById("save-settings") as HTMLElementWithValue;
        if (updateButtonText && settingsSaved) {
            settingsSaved.value = "Saved!";
            setTimeout(() => {
                settingsSaved.value = "Save Settings";
            }, 2000);
        }
    }

    /**
     * Deletes all settings from Chrome Sync Storage and the local `storage` object and reloads the page
     */
    static async restoreDefaults() {
        if (confirm("Are you sure you want to delete all settings?\nTHIS CANNOT BE UNDONE")) {
            trackEvent("reset_settings", {
                context: "Settings",
                legacyTarget: "restore-defaults",
                legacyAction: "restore default values",
                legacyLabel: "Setting",
            });
            for (let setting in LegacySetting.settings) {
                let storageLocation = LegacySetting.settings[setting].storageLocation;
                if (storageLocation === "sync") {
                    await chrome.storage.sync.remove(setting);
                    delete LegacySetting.rawSyncStorage[setting];
                } else {
                    await chrome.storage.local.remove(setting);
                    delete LegacySetting.rawLocalStorage[setting];
                }
                LegacySetting.settings[setting].onload(
                    undefined,
                    LegacySetting.settings[setting].getElement()
                );
            }
            location.reload();
        }
    }

    /**
     * Exports settings to the clipboard in JSON format
     */
    static export() {
        trackEvent("button_click", {
            id: "export-settings",
            context: "Settings",
            legacyTarget: "export-settings",
            legacyAction: "export settings",
            legacyLabel: "Setting",
        });

        navigator.clipboard
            .writeText(
                JSON.stringify(
                    { sync: LegacySetting.rawSyncStorage, local: LegacySetting.rawLocalStorage },
                    null,
                    2
                )
            )
            .then(() => alert("Copied settings to clipboard!"))
            .catch(err => alert("Exporting settings failed!"));
    }

    /**
     * Import settings from clipboard in JSON format
     */
    static import() {
        trackEvent("button_click", {
            id: "import-settings-attempt",
            context: "Settings",
            legacyTarget: "import-settings",
            legacyAction: "attempt import settings",
            legacyLabel: "Setting",
        });
        if (
            confirm(
                `Are you sure you want to import settings? Importing invalid or malformed settings will most likely break ${EXTENSION_NAME}.`
            )
        ) {
            let importedSettings = prompt("Please paste settings to import below:");

            try {
                let importedSettingsObj = JSON.parse(importedSettings!);

                LegacySetting.setValues(importedSettingsObj.sync, importedSettingsObj.local).then(
                    () => {
                        trackEvent("button_click", {
                            id: "import-settings-success",
                            context: "Settings",
                            legacyTarget: "import-settings",
                            legacyAction: "successfully imported settings",
                            legacyLabel: "Setting",
                        });
                        alert(
                            `Successfully imported settings. If ${EXTENSION_NAME} breaks, please restore defaults or reinstall. Reloading page.`
                        );
                        location.reload();
                    }
                );
            } catch (err) {
                alert(
                    "Failed to import settings! They were probably malformed. Make sure the settings are valid JSON. The top level object should have a 'sync' and 'local' key."
                );
                return;
            }
        }
    }

    /**
     * Callback function called when any setting is changed in the settings menu
     * @param {Event | HTMLElement} event Contains a `target` setting element
     */
    static onModify(element: HTMLElementWithValue) {
        let parent = element.parentElement;
        if (parent && !parent.querySelector(".setting-modified")) {
            parent.appendChild(
                createElement("span", ["setting-modified"], {
                    textContent: " *",
                    title: "This setting has been modified from its saved value",
                })
            );
        }
        let setting = LegacySetting.settings[element.dataset.settingName!];
        setting.modified = true;
        if (setting.onmodify) {
            setting.onmodify(element);
        }
    }

    static onShown() {
        for (let setting in LegacySetting.settings) {
            if (LegacySetting.settings[setting].onshown) {
                LegacySetting.settings[setting].onshown!();
            }
        }
    }

    /**
     * @returns {boolean} `true` if any setting has been modified
     */
    static anyModified(): boolean {
        for (let setting in LegacySetting.settings) {
            if (LegacySetting.settings[setting].modified) {
                return true;
            }
        }
        return false;
    }

    static getValue<T>(name: string, location: "sync" | "local", defaultValue: T): T;
    static getValue<T>(name: string, location: "sync" | "local"): T | undefined;

    /**
     * Gets the value of a setting in the cached copy of the
     * extension's synced storage. If `name` is the name of a `Setting`
     * and the cached storage has no value for that setting, the
     * default value of that setting will be returned instead (unless `defaultValue` is passed)
     * @param {string} name The name of the setting to retrieve
     * @param {any} defaultValue The default value to return if no value is specifically set
     * @returns {any} The setting's cached value, default value, or `defaultValue`
     */
    static getValue<T>(name: string, location: "sync" | "local", defaultValue?: T): T | undefined {
        if (location === "sync" && LegacySetting.rawSyncStorage[name] !== undefined) {
            return LegacySetting.rawSyncStorage[name];
        } else if (location === "local" && LegacySetting.rawLocalStorage[name] !== undefined) {
            return LegacySetting.rawLocalStorage[name];
        } else if (LegacySetting.settings[name] && !defaultValue) {
            return LegacySetting.settings[name].default;
        }
        return defaultValue;
    }

    static getNestedValue<T>(
        parent: string,
        key: string,
        location: "sync" | "local",
        defaultValue: T
    ): T;
    static getNestedValue<T>(
        parent: string,
        key: string,
        location: "sync" | "local"
    ): T | undefined;

    /**
     * Gets the value of a nested property in the cached copy of the
     * extension's synced storage.
     * @param {string} parent The name of the object in which to search for `key`
     * @param {string} key The key within `parent` containing the value
     * @param {any} defaultValue The default value to return if no value is found
     * @returns {any} The setting's cached value, default value, or `defaultValue`
     */
    static getNestedValue<T>(
        parent: string,
        key: string,
        location: "sync" | "local",
        defaultValue?: T
    ): T | undefined {
        if (
            location === "sync" &&
            LegacySetting.rawSyncStorage[parent] &&
            key in LegacySetting.rawSyncStorage[parent]
        ) {
            return LegacySetting.rawSyncStorage[parent][key];
        } else if (
            location === "local" &&
            LegacySetting.rawLocalStorage[parent] &&
            key in LegacySetting.rawLocalStorage[parent]
        ) {
            return LegacySetting.rawLocalStorage[parent][key];
        }
        return defaultValue;
    }

    /**
     * Sets the value of a setting in the extension's synced storage
     * Even if `name` is the name of a `Setting`, that `Setting`'s `onmodify`
     * function will NOT be called.
     * @param {string} name The name of the setting to set the value of
     * @param {any} value The value to set
     */
    static async setValue(name: string, value: any, location: "local" | "sync") {
        if (location === "sync") {
            await LegacySetting.saveModified({ [name]: value }, {}, false, false);
        } else {
            await LegacySetting.saveModified({}, { [name]: value }, false, false);
        }

        if (name === "defaultDomain") {
            chrome.runtime.sendMessage({ type: "updateDefaultDomain", domain: value });
        }
    }

    /**
     * Sets the value of a nested property in the extension's synced storage.
     * @param {string} parent The name of the object in which to place `key`
     * @param {string} key The key within `parent` in which to store the value
     * @param {any} value The value to set
     */
    static async setNestedValue<T>(
        parent: string,
        key: string,
        value: T,
        location: "local" | "sync"
    ) {
        var currentValue = LegacySetting.getValue<{ [x: string]: T }>(parent, location, {});
        currentValue[key] = value;
        if (location === "sync") {
            await LegacySetting.saveModified({ [parent]: currentValue }, {}, false, false);
        } else {
            await LegacySetting.saveModified({}, { [parent]: currentValue }, false, false);
        }
    }

    /**
     * Sets the value of multiple settings in the extension's synced storage
     * Even if a dictionary key is the name of a `Setting`, that `Setting`'s `onmodify`
     * function will NOT be called.
     * @param {Object.<string,any>} syncSettings Dictionary of setting names to values
     * @param {()=>any} callback Function called after new values are saved
     */
    static async setValues(
        syncSettings: { [s: string]: any },
        localSettings: { [s: string]: any }
    ) {
        await LegacySetting.saveModified(syncSettings, localSettings, false, false);
    }
}

export const SIDEBAR_SECTIONS = [
    {
        name: "Quick Access",
        selector: "#right-column-inner div.quick-access-wrapper",
    },
    {
        name: "Reminders",
        selector: "#right-column-inner div.reminders-wrapper",
    },
    {
        name: "Overdue",
        selector: "#right-column-inner div#overdue-submissions.overdue-submissions-wrapper",
    },
    {
        name: "Upcoming",
        selector: "#right-column-inner div.upcoming-submissions-wrapper",
    },
    {
        name: "Upcoming Events",
        selector: "#right-column-inner div#upcoming-events.upcoming-events-wrapper",
    },
    {
        name: "Recently Completed",
        selector: "#right-column-inner div.recently-completed-wrapper",
    },
];

export const SIDEBAR_SECTIONS_MAP = Object.fromEntries(SIDEBAR_SECTIONS.map(s => [s.name, s]));

/**
 * Returns `true` if current domain is `lms.lausd.net`
 * @returns {boolean}
 */
export function isLAUSD(): boolean {
    return LegacySetting.getValue("defaultDomain", "sync") === "lms.lausd.net";
}

export function generateDebugInfo() {
    return JSON.stringify(
        {
            version: chrome.runtime.getManifest().version,
            getBrowser: getBrowser(),
            url: location.href,
            storageContents: {
                sync: LegacySetting.rawSyncStorage,
                local: LegacySetting.rawLocalStorage,
            },
            userAgent: navigator.userAgent,
        },
        null,
        2
    );
}

export function getGradingScale(courseId: string | null): Record<string, string> {
    let defaultGradingScale = { "90": "A", "80": "B", "70": "C", "60": "D", "0": "F" };

    if (LegacySetting.rawSyncStorage.defaultGradingScale) {
        defaultGradingScale = LegacySetting.rawSyncStorage.defaultGradingScale;
    }

    if (
        courseId !== null &&
        LegacySetting.rawSyncStorage.gradingScales &&
        LegacySetting.rawSyncStorage.gradingScales[courseId]
    ) {
        return LegacySetting.rawSyncStorage.gradingScales[courseId];
    }

    return defaultGradingScale;
}
