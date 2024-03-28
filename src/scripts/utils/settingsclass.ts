import { createElement } from "./dom";
import { trackEvent } from "./analytics";

type HTMLElementWithValue = (HTMLElement & { value: any });

export default class Setting {
    name: string;
    modified: boolean;
    default: any;
    control: HTMLDivElement;

    onmodify: (event: Event) => void;
    onsave: (setting: HTMLElementWithValue) => any;
    onload: (value: any, element: HTMLElementWithValue) => any;
    onshown?: () => any;

    static __settings: { [s: string]: Setting } = {};
    static __storage: { [s: string]: any } = {};

    constructor(name: string, friendlyName: string, description: string, defaultValue: any, type: string, options: any, onload: (arg0: any, arg1: HTMLElementWithValue) => any, onmodify: (arg0: Event) => void, onsave: (arg0: HTMLElementWithValue) => any, onshown?: () => any) {
        this.name = name;
        this.onmodify = onmodify;
        this.onsave = onsave;
        this.onload = onload;
        this.onshown = onshown;
        this.modified = false;
        this.default = defaultValue;

        /**
         * Returns the element control to be used to edit the setting's value by the user
         * @returns {HTMLElement} A setting element
         */
        this.control = (() => {
            let setting = createElement("div", ["setting-entry"]);
            let title = createElement("h2", ["setting-title"], { textContent: friendlyName + ": " });
            let helpText = createElement("p", ["setting-description"], { innerHTML: description });

            let controlElement: (HTMLElement & { value: any }) | null = null;

            switch (type) {
                case "number":
                case "text":
                case "button":
                    controlElement = createElement("input", undefined, Object.assign({ type: type }, options));
                    title.appendChild(controlElement);
                    if (type == "button") controlElement.onclick = Setting.onModify;
                    else controlElement.oninput = Setting.onModify;
                    break;
                case "select":
                    controlElement = createElement("select");
                    for (let option of options.options) {
                        controlElement.appendChild(createElement("option", undefined, { textContent: option.text, value: option.value }));
                    }
                    title.appendChild(controlElement);
                    controlElement.onchange = Setting.onModify;
                    break;
                case "custom":
                default:
                    controlElement = options.element as (HTMLElement & { value: any });
                    title.appendChild(controlElement);
                    break;
            }

            setting.appendChild(title);
            setting.appendChild(helpText);

            controlElement.dataset.settingName = name;
            controlElement.id = `setting-input-${name}`

            if (!Setting.__storage[name]) {
                Setting.__storage[name] = defaultValue;
            }

            if (this.onload) {
                controlElement.value = this.onload(Setting.__storage[name], controlElement) || this.default;
            } else {
                controlElement.value = Setting.__storage[name] || this.default;
            }

            return setting;
        })();
        Setting.__settings[name] = this;
    }

    getElement() {
        return document.getElementById(`setting-input-${this.name}`) as HTMLElementWithValue;
    }

    /**
     * Saves modified settings to the Chrome Sync Storage
     * @param {Object.<string,any>} modifiedValues An object containing modified setting keys and values
     * @param {boolean} [updateButtonText=true] Change the value of the "Save Settings" button to "Saved!" temporarily
     * @param {()=>any} [callback=null] A function called after settings have been saved and updated
     * @param {boolean} [saveUiSettings=true] Whether or not to save modified settings from the UI as well as the passed dictionary.
     */
    static saveModified(modifiedValues: { [s: string]: any; }, updateButtonText: boolean = true, callback?: () => any, saveUiSettings: boolean = true) {
        let newValues = {};
        if (modifiedValues) {
            Object.assign(newValues, modifiedValues);
        }
        if (saveUiSettings) {
            for (let setting in Setting.__settings) {
                let v = Setting.__settings[setting];
                if (v.modified) {
                    let value = v.onsave(v.getElement());
                    newValues[setting] = value;
                    Setting.__storage[setting] = value;
                    v.onload(value, v.getElement());
                    v.modified = false;
                }
            }
        }
        chrome.storage.sync.set(newValues, () => {
            for (let settingName in newValues) {
                let setting = Setting.__settings[settingName];
                if (!setting) {
                    continue;
                }

                trackEvent("update_setting", {
                    id: settingName,
                    context: "Settings",
                    value: newValues[settingName],
                    legacyTarget: settingName,
                    legacyAction: `set value: ${newValues[settingName]}`,
                    legacyLabel: "Setting"
                });

                if (!setting.getElement()) {
                    continue;
                }
                let settingModifiedIndicator = setting.getElement().parentElement!.querySelector(".setting-modified");
                if (settingModifiedIndicator) {
                    settingModifiedIndicator.remove();
                }
            }

            updateSettings(callback);
        });

        if (updateButtonText) {
            let settingsSaved = document.getElementById("save-settings") as HTMLElementWithValue;
            settingsSaved.value = "Saved!";
            setTimeout(() => {
                settingsSaved.value = "Save Settings";
            }, 2000);
        }
    }

    /**
     * Deletes all settings from Chrome Sync Storage and the local `storage` object and reloads the page
     */
    static restoreDefaults() {
        if (confirm("Are you sure you want to delete all settings?\nTHIS CANNOT BE UNDONE")) {
            trackEvent("reset_settings", {
                context: "Settings",
                legacyTarget: "restore-defaults",
                legacyAction: "restore default values",
                legacyLabel: "Setting"
            });
            for (let setting in Setting.__settings) {
                delete Setting.__storage[setting];
                chrome.storage.sync.remove(setting);
                Setting.__settings[setting].onload(undefined, Setting.__settings[setting].getElement());
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
            legacyLabel: "Setting"
        });

        navigator.clipboard.writeText(JSON.stringify(Setting.__storage, null, 2))
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
            legacyLabel: "Setting"
        });
        if (confirm("Are you sure you want to import settings? Importing invalid or malformed settings will most likely break Schoology Plus.")) {
            let importedSettings = prompt("Please paste settings to import below:");

            try {
                let importedSettingsObj = JSON.parse(importedSettings!);

                Setting.setValues(importedSettingsObj, () => {
                    trackEvent("button_click", {
                        id: "import-settings-success",
                        context: "Settings",
                        legacyTarget: "import-settings",
                        legacyAction: "successfully imported settings",
                        legacyLabel: "Setting"
                    });
                    alert("Successfully imported settings. If Schoology Plus breaks, please restore defaults or reinstall. Reloading page.")
                    location.reload();
                });
            } catch (err) {
                alert("Failed to import settings! They were probably malformed. Make sure the settings are valid JSON.");
                return;
            }
        }
    }


    /**
     * Callback function called when any setting is changed in the settings menu
     * @param {Event} event Contains a `target` setting element
     */
    static onModify(event: Event) {
        let element = (event.target || event) as HTMLElement;
        let parent = element.parentElement;
        if (parent && !parent.querySelector(".setting-modified")) {
            parent.appendChild(createElement("span", ["setting-modified"], { textContent: " *", title: "This setting has been modified from its saved value" }));
        }
        let setting = Setting.__settings[element.dataset.settingName!];
        setting.modified = true;
        if (setting.onmodify) {
            setting.onmodify(event);
        }
    }

    static onShown() {
        for (let setting in Setting.__settings) {
            if (Setting.__settings[setting].onshown) {
                Setting.__settings[setting].onshown!();
            }
        }
    }

    /**
     * @returns {boolean} `true` if any setting has been modified
     */
    static anyModified(): boolean {
        for (let setting in Setting.__settings) {
            if (Setting.__settings[setting].modified) {
                return true;
            }
        }
        return false;
    }

    /**
     * Gets the value of a setting in the cached copy of the
     * extension's synced storage. If `name` is the name of a `Setting`
     * and the cached storage has no value for that setting, the
     * default value of that setting will be returned instead (unless `defaultValue` is passed)
     * @param {string} name The name of the setting to retrieve
     * @param {any} defaultValue The default value to return if no value is specifically set
     * @returns {any} The setting's cached value, default value, or `defaultValue`
     */
    static getValue(name: string, defaultValue: any = undefined): any {
        if (Setting.__storage[name]) {
            return Setting.__storage[name];
        } else if (Setting.__settings[name] && !defaultValue) {
            return Setting.__settings[name].default;
        }
        return defaultValue;
    }

    /**
     * Gets the value of a nested property in the cached copy of the
     * extension's synced storage.
     * @param {string} parent The name of the object in which to search for `key`
     * @param {string} key The key within `parent` containing the value
     * @param {any} defaultValue The default value to return if no value is found
     * @returns {any} The setting's cached value, default value, or `defaultValue`
     */
    static getNestedValue(parent: string, key: string, defaultValue: any = undefined): any {
        if (Setting.__storage[parent] && key in Setting.__storage[parent]) {
            return Setting.__storage[parent][key];
        }
        return defaultValue;
    }

    /**
     * Sets the value of a setting in the extension's synced storage
     * Even if `name` is the name of a `Setting`, that `Setting`'s `onmodify`
     * function will NOT be called.
     * @param {string} name The name of the setting to set the value of
     * @param {any} value The value to set
     * @param {()=>any} callback Function called after new value is saved
     */
    static setValue(name: string, value: any, callback?: () => any) {
        Setting.saveModified({ [name]: value }, false, callback, false);

        if (name === "defaultDomain") {
            chrome.runtime.sendMessage({ type: "updateDefaultDomain", domain: value });
        }
    }

    /**
     * Sets the value of a nested property in the extension's synced storage.
     * @param {string} parent The name of the object in which to place `key`
     * @param {string} key The key within `parent` in which to store the value
     * @param {any} value The value to set
     * @param {()=>any} callback Function called after new value is saved
     */
    static setNestedValue(parent: string, key: string, value: any, callback?: () => any) {
        var currentValue = Setting.getValue(parent, {});
        currentValue[key] = value;
        Setting.saveModified({ [parent]: currentValue }, false, callback, false);
    }

    /**
     * Sets the value of multiple settings in the extension's synced storage
     * Even if a dictionary key is the name of a `Setting`, that `Setting`'s `onmodify`
     * function will NOT be called.
     * @param {Object.<string,any>} dictionary Dictionary of setting names to values
     * @param {()=>any} callback Function called after new values are saved
     */
    static setValues(dictionary: { [s: string]: any; }, callback?: () => any) {
        Setting.saveModified(dictionary, false, callback, false);
    }
}