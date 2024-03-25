import browser from "webextension-polyfill";
import { createElement } from "./dom";

var SIDEBAR_SECTIONS = [
    {
        name: "Quick Access",
        selector: "#right-column-inner div.quick-access-wrapper"
    },
    {
        name: "Reminders",
        selector: "#right-column-inner div.reminders-wrapper"
    },
    {
        name: "Overdue",
        selector: "#right-column-inner div#overdue-submissions.overdue-submissions-wrapper"
    },
    {
        name: "Upcoming",
        selector: "#right-column-inner div.upcoming-submissions-wrapper"
    },
    {
        name: "Upcoming Events",
        selector: "#right-column-inner div#upcoming-events.upcoming-events-wrapper"
    },
    {
        name: "Recently Completed",
        selector: "#right-column-inner div.recently-completed-wrapper"
    },
];


var modalContents: HTMLDivElement | undefined = undefined;

function getModalContents() {
    return modalContents || createElement("p", [], { textContent: "Error loading settings" });
}


/**
 * Returns `true` if current domain is `lms.lausd.net`
 * @returns {boolean}
 */
function isLAUSD() {
    return Setting.getValue("defaultDomain") === "lms.lausd.net";
}

var SIDEBAR_SECTIONS_MAP = Object.fromEntries(SIDEBAR_SECTIONS.map(s => [s.name, s]));
var firstLoad = true;

/** @type {Object.<string,any>} */
let __storage: { [s: string]: any; } = {};

/**
 * Updates the contents of the settings modal to reflect changes made by the user to all settings
 * @param {()=>any} callback Called after settings are updated
 */
async function updateSettings(callback: () => any) {
    const storageContents = await browser.storage.sync.get(null);
    __storage = storageContents;

    // wrapper functions for e.g. defaults
    __storage.getGradingScale = function (courseId: string | null) {
        let defaultGradingScale = { "90": "A", "80": "B", "70": "C", "60": "D", "0": "F" };

        if (__storage.defaultGradingScale) {
            defaultGradingScale = __storage.defaultGradingScale;
        }

        if (courseId !== null && __storage.gradingScales && __storage.gradingScales[courseId]) {
            return __storage.gradingScales[courseId];
        }

        return defaultGradingScale;
    }

    if (firstLoad) {
        if (storageContents.themes) {
            for (let t of storageContents.themes) {
                themes.push(Theme.loadFromObject(t));
            }
        }

        Theme.apply(Theme.active);
        firstLoad = false;
    }

    let noControl = document.createElement("div");

    modalContents = createElement("div", [], undefined, [
        createElement("div", ["splus-modal-contents", "splus-settings-tabs"], {}, [
            createElement("ul", [], {}, [
                createElement("li", [], {}, [createElement("a", [], { href: "#splus-settings-section-appearance", textContent: "Appearance" })]),
                createElement("li", [], {}, [createElement("a", [], { href: "#splus-settings-section-sidebar", textContent: "Homepage/Sidebar" })]),
                createElement("li", [], {}, [createElement("a", [], { href: "#splus-settings-section-grades", textContent: "Grades" })]),
                createElement("li", [], {}, [createElement("a", [], { href: "#splus-settings-section-utilities", textContent: "Utilities" })]),
            ]),
            createElement("div", [], { id: "splus-settings-section-appearance" }, [
                new Setting(
                    "themeEditor",
                    "Theme Editor",
                    "Click to open the theme editor to create, edit, or select a theme",
                    "Theme Editor",
                    "button",
                    {},
                    value => "Theme Editor",
                    event => location.href = chrome.runtime.getURL("/theme-editor.html")
                ).control,
                new Setting(
                    "theme",
                    "Theme",
                    "Change the theme of Schoology Plus",
                    "Schoology Plus",
                    "select",
                    {
                        options: [
                            ...__defaultThemes.filter(
                                t => LAUSD_THEMES.includes(t.name) ? isLAUSD() : true
                            ).map(t => { return { text: t.name, value: t.name } }),
                            ...(__storage.themes || []).map(
                                t => { return { text: t.name, value: t.name } }
                            )
                        ]
                    },
                    value => {
                        tempTheme = undefined;
                        Theme.apply(Theme.active);
                        return value;
                    },
                    event => {
                        tempTheme = event.target.value;
                        Theme.apply(Theme.byName(event.target.value));
                    },
                    element => element.value
                ).control,
                new Setting(
                    "courseIcons",
                    "Override Course Icons",
                    "[Refresh required to disable] Replace the course icons with the selected theme's icons",
                    isLAUSD() ? "enabled" : "defaultOnly",
                    "select",
                    {
                        options: [
                            {
                                text: "All Icons",
                                value: "enabled"
                            },
                            {
                                text: "Default Icons Only",
                                value: "defaultOnly",
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "useDefaultIconSet",
                    "Use Built-In Icon Set",
                    `[Refresh required] Use Schoology Plus's <a href="${chrome.runtime.getURL("/default-icons.html")}" target="_blank">default course icons</a> as a fallback when a custom icon has not been specified. NOTE: these icons were meant for schools in Los Angeles Unified School District and may not work correctly for other schools.`,
                    isLAUSD() ? "enabled" : "disabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "courseIconFavicons",
                    "Use Course Icons as Favicons When Possible",
                    "[Refresh required] Use the course's icon as the favicon (the icon next to the tab's title) on most course pages. This will not work in all cases.",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "overrideUserStyles",
                    "Override Styled Text",
                    "Override styled text in homefeed posts and discussion responses when using modern themes. WARNING: This guarantees text is readable on dark theme, but removes colors and other styling that may be important. You can always use the Toggle Theme button on the navigation bar to temporarily disble your theme.",
                    "true",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "true"
                            },
                            {
                                text: "Disabled",
                                value: "false"
                            }
                        ]
                    },
                    value => {
                        document.documentElement.setAttribute("style-override", value);
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
                    element => element.value
                ).control,
                new Setting(
                    "archivedCoursesButton",
                    "Archived Courses Button",
                    'Adds a link to see past/archived courses in the courses dropdown',
                    "show",
                    "select",
                    {
                        options: [
                            {
                                text: "Show",
                                value: "show"
                            },
                            {
                                text: "Hide",
                                value: "hide"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "powerSchoolLogo",
                    "PowerSchool Logo",
                    "Controls the visibility of the PowerSchool logo on the navigation bar",
                    "block",
                    "select",
                    {
                        options: [
                            {
                                text: "Show",
                                value: "block"
                            },
                            {
                                text: "Hide",
                                value: "none"
                            }
                        ]
                    },
                    value => {
                        setCSSVariable("power-school-logo-display", value);
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
                    element => element.value
                ).control,
            ]),
            createElement("div", [], { id: "splus-settings-section-sidebar" }, [
                new Setting(
                    "indicateSubmission",
                    "Submitted Assignments Checklist",
                    '[Reload required] Shows a checkmark, shows a strikethrough, or hides items in "Upcoming Assignments" that have been submitted. If "Show Check Mark" is selected, a checklist function will be enabled allowing you to manually mark assignments as complete.',
                    "check",
                    "select",
                    {
                        options: [
                            {
                                text: "Show Check Mark ✔ (Enables manual checklist)",
                                value: "check"
                            },
                            {
                                text: "Show Strikethrough (Doesn't allow manual checklist)",
                                value: "strikethrough"
                            },
                            {
                                text: "Hide Assignment (Not recommended)",
                                value: "hide"
                            },
                            {
                                text: "Do Nothing",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "toDoIconVisibility",
                    '"Overdue" and "Due Tomorrow" Icon Visibility',
                    'Controls the visibility of the "Overdue" exclamation point icon and the "Due Tomorrow" clock icon in the Upcoming and Overdue lists on the sidebar of the homepage',
                    "visible",
                    "select",
                    {
                        options: [
                            {
                                text: "Show Icons",
                                value: "visible"
                            },
                            {
                                text: "Hide Icons",
                                value: "hidden"
                            }
                        ]
                    },
                    value => {
                        setCSSVariable("to-do-list-icons-display", "block");
                        switch (value) {
                            case "hidden":
                                setCSSVariable("to-do-list-icons-display", "none");
                                break;
                        }
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
                    element => element.value
                ).control,
                new Setting(
                    "sidebarSectionOrder",
                    "Customize Sidebar",
                    "",
                    {
                        include: [],
                        exclude: []
                    },
                    "custom",
                    {
                        element: createElement("div", [], {}, [
                            createElement("p", [], { style: { fontWeight: "normal" }, textContent: "Drag items between the sections to control which sections of the sidebar are visible and the order in which they are shown." }),
                            createElement("div", ["sortable-container"], {}, [
                                createElement("div", ["sortable-list"], {}, [
                                    createElement("h3", ["splus-underline-heading"], { textContent: "Sections to Hide" }),
                                    createElement("ul", ["sidebar-sortable", "splus-modern-border-radius", "splus-modern-padding"], { id: "sidebar-excluded-sortable" })
                                ]),
                                createElement("div", ["sortable-list"], {}, [
                                    createElement("h3", ["splus-underline-heading"], { textContent: "Sections to Show" }),
                                    createElement("ul", ["sidebar-sortable", "splus-modern-border-radius", "splus-modern-padding"], { id: "sidebar-included-sortable" })
                                ]),
                            ])
                        ]),
                    },
                    function (value, element) {
                        let includeList = element.querySelector("#sidebar-included-sortable");
                        let excludeList = element.querySelector("#sidebar-excluded-sortable");

                        includeList.innerHTML = "";
                        excludeList.innerHTML = "";

                        if (!value || !value.include || !value.exclude) {
                            value = { include: [], exclude: [] };
                        }

                        for (let section of value.include) {
                            includeList.appendChild(createElement("p", ["sortable-item", "splus-modern-border-radius", "splus-modern-padding"], { textContent: section }))
                        }

                        for (let section of value.exclude) {
                            excludeList.appendChild(createElement("p", ["sortable-item", "splus-modern-border-radius", "splus-modern-padding"], { textContent: section }))
                        }

                        for (let section of SIDEBAR_SECTIONS) {
                            if (!value.include.includes(section.name) && !value.exclude.includes(section.name)) {
                                includeList.appendChild(createElement("p", ["sortable-item", "splus-modern-border-radius", "splus-modern-padding"], { textContent: section.name }))
                            }
                        }
                    },
                    function (event) { console.log(event); },
                    element => {
                        let includeList = element.querySelector("#sidebar-included-sortable");
                        let excludeList = element.querySelector("#sidebar-excluded-sortable");

                        return {
                            include: Array.from(includeList.children).map(e => e.textContent),
                            exclude: Array.from(excludeList.children).map(e => e.textContent)
                        }
                    },
                    function () {
                        $(".sidebar-sortable").sortable({
                            connectWith: ".sidebar-sortable",
                            stop: () => Setting.onModify(this.getElement())
                        }).disableSelection();
                    }
                ).control,
            ]),
            createElement("div", [], { id: "splus-settings-section-grades" }, [
                new Setting(
                    "customScales",
                    "Custom Grading Scales",
                    "[Refresh required] Uses custom grading scales (set per-course in course settings) when courses don't have one defined",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "orderClasses",
                    "Order Classes",
                    "[Refresh required] Changes the order of your classes on the grades and mastery pages (only works if your course names contain PER N or PERIOD N)",
                    "period",
                    "select",
                    {
                        options: [
                            {
                                text: "By Period",
                                value: "period"
                            },
                            {
                                text: "Alphabetically",
                                value: "alpha"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "weightedGradebookIndicator",
                    "Weighted Gradebook Indicator",
                    "Adds an indicator next to gradebooks which are weighted",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Show",
                                value: "enabled"
                            },
                            {
                                text: "Hide",
                                value: "disabled"
                            }
                        ]
                    },
                    value => {
                        setCSSVariable("weighted-gradebook-indicator-display", value == "enabled" ? "inline" : "none")
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
                    element => element.value
                ).control,
            ]),
            createElement("div", [], { id: "splus-settings-section-utilities" }, [
                new Setting(
                    "notifications",
                    "Desktop Notifications",
                    "Displays desktop notifications and a number badge on the extension button when new grades are entered",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enable All Notifications",
                                value: "enabled"
                            },
                            {
                                text: "Number Badge Only (No Pop-Ups)",
                                value: "badge"
                            },
                            {
                                text: "Pop-Ups Only (No Badge)",
                                value: "popup"
                            },
                            {
                                text: "Disable All Notifications",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "broadcasts",
                    "Announcement Notifications",
                    "Displays news feed posts for announcements sent to all Schoology Plus users",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enable Announcements",
                                value: "enabled"
                            },
                            {
                                text: "Disable Announcements",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "autoBypassLinkRedirects",
                    "Automatically Bypass Link Redirects",
                    "Automatically skip the external link redirection page, clicking 'Continue' by default",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "sessionCookiePersist",
                    "Stay Logged In",
                    "[Logout/login required] Stay logged in to Schoology when you restart your browser",
                    "disabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                createElement("div", ["setting-entry"], {}, [
                    createElement("h2", ["setting-title"], {}, [
                        createElement("a", [], { href: "#", textContent: "Change Schoology Account Access", onclick: () => { location.pathname = "/api"; }, style: { fontSize: "" } })
                    ]),
                    createElement("p", ["setting-description"], { textContent: "Grant Schoology Plus access to your Schoology API Key so many features can function, or revoke that access." })
                ]),
                getBrowser() !== "Firefox" ? createElement("div", ["setting-entry"], {}, [
                    createElement("h2", ["setting-title"], {}, [
                        createElement("a", [], { href: "#", textContent: "Anonymous Usage Statistics", onclick: () => openModal("analytics-modal"), style: { fontSize: "" } })
                    ]),
                    createElement("p", ["setting-description"], { textContent: "[Reload required] Allow Schoology Plus to collect anonymous information about how you use the extension. We don't collect any personal information per our privacy policy." })
                ]) : noControl,
            ]),
        ]),
        createElement("div", ["settings-buttons-wrapper"], undefined, [
            createButton("save-settings", "Save Settings", () => Setting.saveModified()),
            createElement("div", ["settings-actions-wrapper"], {}, [
                createElement("a", [], { textContent: "View Debug Info", onclick: () => openModal("debug-modal"), href: "#" }),
                createElement("a", [], { textContent: "Export Settings", onclick: Setting.export, href: "#" }),
                createElement("a", [], { textContent: "Import Settings", onclick: Setting.import, href: "#" }),
                createElement("a", ["restore-defaults"], { textContent: "Restore Defaults", onclick: Setting.restoreDefaults, href: "#" })
            ]),
        ])
    ]);

    if (callback && typeof callback == "function") {
        callback();
    }
}

/**
 * @type {Object.<string,Setting>}
 */
let __settings: { [s: string]: Setting; } = {};

type HTMLElementWithValue = (HTMLElement & { value: any });

interface Setting {
    name: string;
    getElement: () => HTMLElementWithValue | null;
    onmodify?: (event: Event) => void;
    onsave?: (element: HTMLElementWithValue) => any;
    onload?: (value: any, element: HTMLElementWithValue) => any;
    onshown?: () => any;
    modified: boolean;
    default: any;
    control: HTMLDivElement;
}

/**
 * Creates a setting, appends it to the settings list
 * @param {string} name - The name of the setting, to be stored in extension settings
 * @param {string} friendlyName - The display name of the setting
 * @param {string} description - A description of the setting and appropriate values
 * @param {any} defaultValue - The default value of the setting
 * @param {string} type - Setting control type, one of ["number", "text", "button", "select"]
 * @param {Object|Object[]} options Additional options, format dependent on setting **type**
 * - **number, text, button**: Directly applied as element properties
 * - **select**: *options* property on `options` object should be an array of objects containing *text* and *value* properties
 * @param {function(any):any} onload Called with the setting's current value when the page is loaded and when the setting is changed
 * - *This function should return `undefined` or `null` when the setting's default value should be used*
 * @param {function(Event):void} onmodify Function called with the UI modification event when setting value is changed
 * - *Should be used to show how changing the setting affects the page if applicable*
 * @param {function(HTMLElement):any} onsave Function called when setting is saved
 * - First argument is the HTML element containing the setting value set by the user
 * - Must return the value to be saved to extension settings
 * - Will only be called if user saves settings and setting was modified
 * @param {function():any} onshown Function called when the setting element is shown on screen
 */
export function Setting(this: Setting, name: string, friendlyName: string, description: string, defaultValue: any, type: string, options: any, onload?: (arg0: any, arg1: HTMLElementWithValue) => any, onmodify?: (arg0: Event) => void, onsave?: (arg0: HTMLElementWithValue) => any, onshown?: () => any) {
    this.name = name;
    this.getElement = () => document.getElementById(`setting-input-${this.name}`) as HTMLElementWithValue;
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

        if (!__storage[name]) {
            __storage[name] = defaultValue;
        }

        if (this.onload) {
            controlElement.value = this.onload(__storage[name], controlElement) || this.default;
        } else {
            controlElement.value = __storage[name] || this.default;
        }

        return setting;
    })();
    __settings[name] = this;
}

/**
 * Saves modified settings to the Chrome Sync Storage
 * @param {Object.<string,any>} modifiedValues An object containing modified setting keys and values
 * @param {boolean} [updateButtonText=true] Change the value of the "Save Settings" button to "Saved!" temporarily
 * @param {()=>any} [callback=null] A function called after settings have been saved and updated
 * @param {boolean} [saveUiSettings=true] Whether or not to save modified settings from the UI as well as the passed dictionary.
 */
Setting.saveModified = function (modifiedValues: { [s: string]: any; }, updateButtonText: boolean = true, callback: () => any = undefined, saveUiSettings: boolean = true) {
    let newValues = {};
    if (modifiedValues) {
        Object.assign(newValues, modifiedValues);
    }
    if (saveUiSettings) {
        for (let setting in __settings) {
            let v = __settings[setting];
            if (v.modified) {
                let value = v.onsave(v.getElement());
                newValues[setting] = value;
                __storage[setting] = value;
                v.onload(value, v.getElement());
                v.modified = false;
            }
        }
    }
    chrome.storage.sync.set(newValues, () => {
        for (let settingName in newValues) {
            let setting = __settings[settingName];
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
            let settingModifiedIndicator = setting.getElement().parentElement.querySelector(".setting-modified");
            if (settingModifiedIndicator) {
                settingModifiedIndicator.remove();
            }
        }

        updateSettings(callback);
    });

    if (updateButtonText) {
        let settingsSaved = document.getElementById("save-settings");
        settingsSaved.value = "Saved!";
        setTimeout(() => {
            settingsSaved.value = "Save Settings";
        }, 2000);
    }
}

/**
 * Deletes all settings from Chrome Sync Storage and the local `storage` object and reloads the page
 */
Setting.restoreDefaults = function () {
    if (confirm("Are you sure you want to delete all settings?\nTHIS CANNOT BE UNDONE")) {
        trackEvent("reset_settings", {
            context: "Settings",
            legacyTarget: "restore-defaults",
            legacyAction: "restore default values",
            legacyLabel: "Setting"
        });
        for (let setting in __settings) {
            delete __storage[setting];
            chrome.storage.sync.remove(setting);
            __settings[setting].onload(undefined, __settings[setting].getElement());
        }
        location.reload();
    }
}

/**
 * Exports settings to the clipboard in JSON format
 */
Setting.export = function () {
    trackEvent("button_click", {
        id: "export-settings",
        context: "Settings",
        legacyTarget: "export-settings",
        legacyAction: "export settings",
        legacyLabel: "Setting"
    });

    navigator.clipboard.writeText(JSON.stringify(__storage, null, 2))
        .then(() => alert("Copied settings to clipboard!"))
        .catch(err => alert("Exporting settings failed!"));
}

/**
 * Import settings from clipboard in JSON format
 */
Setting.import = function () {
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
            let importedSettingsObj = JSON.parse(importedSettings);

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
Setting.onModify = function (event: Event) {
    let element = event.target || event;
    let parent = element.parentElement;
    if (parent && !parent.querySelector(".setting-modified")) {
        parent.appendChild(createElement("span", ["setting-modified"], { textContent: " *", title: "This setting has been modified from its saved value" }));
    }
    let setting = __settings[element.dataset.settingName];
    setting.modified = true;
    if (setting.onmodify) {
        setting.onmodify(event);
    }
}

Setting.onShown = function () {
    for (let setting in __settings) {
        if (__settings[setting].onshown) {
            __settings[setting].onshown();
        }
    }
}

/**
 * @returns {boolean} `true` if any setting has been modified
 */
Setting.anyModified = function (): boolean {
    for (let setting in __settings) {
        if (__settings[setting].modified) {
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
Setting.getValue = function (name: string, defaultValue: any = undefined): any {
    if (__storage[name]) {
        return __storage[name];
    } else if (__settings[name] && !defaultValue) {
        return __settings[name].default;
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
Setting.getNestedValue = function (parent: string, key: string, defaultValue: any = undefined): any {
    if (__storage[parent] && key in __storage[parent]) {
        return __storage[parent][key];
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
Setting.setValue = function (name: string, value: any, callback: () => any = undefined) {
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
Setting.setNestedValue = function (parent: string, key: string, value: any, callback: () => any = undefined) {
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
Setting.setValues = function (dictionary: { [s: string]: any; }, callback: () => any = undefined) {
    Setting.saveModified(dictionary, false, callback, false);
}