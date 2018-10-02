// Process options
var firstLoad = true;
updateSettings();

var defaultCourseIconUrlRegex = /\/sites\/[a-zA-Z0-9_-]+\/themes\/[%a-zA-Z0-9_-]+\/images\/course-default.(?:svg|png|jpe?g|gif)(\?[a-zA-Z0-9_%-]+(=[a-zA-Z0-9_%-]+)?(&[a-zA-Z0-9_%-]+(=[a-zA-Z0-9_%-]+)?)*)?$/;    

// Functions

/** @type {HTMLDivElement} */
var modalContents;

function getModalContents() {
    return modalContents;
}

/**
 * Creates a DOM element
 * @returns {HTMLElement} A DOM element
 * @param {string} tag - The HTML tag name of the type of DOM element to create
 * @param {string[]} classList - CSS classes to apply to the DOM element
 * @param {Object.<string,any>} properties - Properties to apply to the DOM element
 * @param {HTMLElement[]} children - Elements to append as children to the created element
 */
function createElement(tag, classList, properties, children) {
    let element = document.createElement(tag);
    if (classList) {
        for (let c of classList) {
            element.classList.add(c);
        }
    }
    if (properties) {
        for (let property in properties) {
            element[property] = properties[property];
        }
    }
    if (children) {
        for (let child of children) {
            element.appendChild(child);
        }
    }
    return element;
}

/** @type {Object.<string,any>} */
let storage = {};

/**
 * Updates the contents of the settings modal to reflect changes made by the user to all settings
 * @param {()=>any} callback Called after settings are updated
 */
function updateSettings(callback) {
    chrome.storage.sync.get(null, storageContents => {
        storage = storageContents;

        // wrapper functions for e.g. defaults
        storage.getGradingScale = function (courseId) {
            let defaultGradingScale = { "90": "A", "80": "B", "70": "C", "60": "D", "0": "F" };
            if (this.gradingScales && this.gradingScales[courseId]) {
                return this.gradingScales[courseId];
            }

            return defaultGradingScale;
        }

        if (firstLoad) {
            if (storageContents.themes) {
                for (let t of storageContents.themes) {
                    themes.push(Theme.loadFromObject(t));
                }
            }

            // themes.push(new Theme("Install and Manage Themes..."));
            Theme.apply(Theme.active);
            firstLoad = false;
        }

        modalContents = createElement("div", [], undefined, [
            createElement("div", ["splus-modal-contents"], {}, [
                new Setting(
                    "theme",
                    "Theme",
                    "Click to open the theme editor to create, edit, or select a theme",
                    "Schoology Plus",
                    "button",
                    {},
                    value => value || "Schoology Plus",
                    event => location.href = chrome.runtime.getURL("/theme-editor.html"),
                    element => element.value
                ).getControl(),
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
                ).getControl(),
                new Setting(
                    "broadcasts",
                    "Announcement Notifications",
                    "Displays desktop notifications and news feed posts for announcements sent to all Schoology Plus users",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enable Announcements",
                                value: "enabled"
                            },
                            {
                                text: "Announcement News Feed Posts Only",
                                value: "feed"
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
                ).getControl(),
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
                ).getControl(),
                new Setting(
                    "orderClasses",
                    "Order Classes",
                    "[Refresh required] Changes the order of your classes on the grades and mastery pages",
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
                ).getControl(),
                new Setting(
                    "courseIcons",
                    "Override Course Icons",
                    "[Refresh required to disable] Replace the course icons with the selected theme's icons",
                    "enabled",
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
                ).getControl()
            ]),
            createElement("div", ["settings-buttons-wrapper"], undefined, [
                createButton("save-settings", "Save Settings", saveSettings),
                createElement("a", ["restore-defaults"], { textContent: "Restore Defaults", onclick: restoreDefaults, href: "#" })
            ])
        ]);

        if (callback && typeof callback == "function") {
            callback();
        }
    });
}

/**
 * @type {Object.<string,Setting>}
 */
let settings = {};

/**
 * Callback function called when any setting is changed in the settings menu
 * @param {Event} event Contains a `target` setting element
 */
function settingModified(event) {
    let element = event.target || event;
    let parent = element.parentElement;
    if (parent && !parent.querySelector(".setting-modified")) {
        parent.appendChild(createElement("span", ["setting-modified"], { textContent: " *", title: "This setting has been modified from its saved value" }));
    }
    let setting = settings[element.dataset.settingName];
    setting.modified = true;
    if (setting.onmodify) {
        setting.onmodify(event);
    }
}

/**
 * @returns {boolean} `true` if any setting has been modified
 */
function anySettingsModified() {
    for (let setting in settings) {
        if (settings[setting].modified) {
            return true;
        }
    }
    return false;
}

/**
 * Saves modified settings to the Chrome Sync Storage
 * @param {Object.<string,any>} modifiedValues An object containing modified setting keys and values
 */
function saveSettings(modifiedValues) {
    let newValues = {};
    if (modifiedValues) {
        Object.assign(newValues, modifiedValues);
    }
    for (let setting in settings) {
        let v = settings[setting];
        if (v.modified) {
            let value = v.onsave(v.element());
            newValues[setting] = value;
            storage[setting] = value;
            v.onload(value, v.element());
            v.modified = false;
        }
    }
    chrome.storage.sync.set(newValues, () => {
        for (let element of document.querySelectorAll(".setting-modified")) {
            element.parentElement.removeChild(element);
        }
        updateSettings();
    });

    let settingsSaved = document.getElementById("save-settings");
    settingsSaved.value = "Saved!";
    setTimeout(() => {
        settingsSaved.value = "Save Settings";
    }, 2000);
}

/**
 * Deletes all settings from Chrome Sync Storage and the local `storage` object
 */
function restoreDefaults() {
    if (confirm("Are you sure you want to delete all settings?\nTHIS CANNOT BE UNDONE")) {
        for (let setting in settings) {
            delete storage[setting];
            chrome.storage.sync.remove(setting);
            settings[setting].onload(undefined, settings[setting].element());
        }
    }
}

/**
 * Creates a Schoology Plus themed button element
 * @param {string} id The ID for the button element
 * @param {string} text The text to show on the button
 * @param {(e: Event)=>void} callback A function to be called when the button is clicked
 */
function createButton(id, text, callback) {
    return createElement("span", ["submit-span-wrapper", "splus-modal-button"], { onclick: callback }, [createElement("input", ["form-submit"], { type: "button", value: text, id: id })]);
}

/**
 * Returns the name of the current browser
 * @returns {"Chrome"|"Firefox"|"Edge"} Name of the current browser
 */
function getBrowser() {
    if (typeof chrome !== "undefined") {
        if (typeof browser !== "undefined") {
            return "Firefox";
        } else {
            return "Chrome";
        }
    } else {
        return "Edge";
    }
}

/**
 * Returns `true` if an element is visible to the user
 * @param {HTMLElement} elem The element to check for visibility
 * @returns {boolean} `true` if element is visible
 */
function isVisible(elem) {
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}

/**
 * Returns all parent elements matching the provided selector.
 * Essentially works like a reverse `document.querySelectorAll`.
 * @param {HTMLElement} elem The target element 
 * @param {string} selector A CSS selector
 * @returns {HTMLElement[]} An array of matching parent elements
 */
function getParents(elem, selector) {
    var parents = [];
    var firstChar;
    if (selector) {
        firstChar = selector.charAt(0);
    }
    for (; elem && elem !== document; elem = elem.parentNode) {
        if (selector) {
            if (firstChar === '.') {
                if (elem.classList.contains(selector.substr(1))) {
                    parents.push(elem);
                }
            }
            if (firstChar === '#') {
                if (elem.id === selector.substr(1)) {
                    parents.push(elem);
                }
            }
            if (firstChar === '[') {
                if (elem.hasAttribute(selector.substr(1, selector.length - 1))) {
                    parents.push(elem);
                }
            }
            if (elem.tagName.toLowerCase() === selector) {
                parents.push(elem);
            }
        } else {
            parents.push(elem);
        }

    }

    return parents;
};

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
 * @param {function(any):void} onmodify Function called when setting value is changed
 * - *Should be used to show how changing the setting affects the page if applicable*
 * @param {function(HTMLElement):any} onsave Function called when setting is saved
 * - First argument is the HTML element containing the setting value set by the user
 * - Must return the value to be saved to extension settings
 * - Will only be called if user saves settings and setting was modified
 */
function Setting(name, friendlyName, description, defaultValue, type, options, onload, onmodify, onsave) {
    this.name = name;
    this.element = () => document.getElementById(`setting-input-${this.name}`);
    this.onmodify = onmodify;
    this.onsave = onsave;
    this.onload = onload;
    this.modified = false;
    this.default = defaultValue;
    /**
     * Returns the element control to be used to edit the setting's value by the user
     * @returns {HTMLElement} A setting element
     */
    this.getControl = () => {
        let setting = createElement("div", ["setting-entry"]);
        let title = createElement("h2", ["setting-title"], { textContent: friendlyName + ": " });
        let helpText = createElement("p", ["setting-description"], { textContent: description });

        switch (type) {
            case "number":
            case "text":
            case "button":
                let inputElement = createElement("input", undefined, Object.assign({ type: type }, options));
                title.appendChild(inputElement);
                if (type == "button") inputElement.onclick = settingModified;
                else inputElement.oninput = settingModified;
                break;
            case "select":
                let selectElement = createElement("select");
                for (let option of options.options) {
                    selectElement.appendChild(createElement("option", undefined, { textContent: option.text, value: option.value }));
                }
                title.appendChild(selectElement);
                selectElement.onchange = settingModified;
                break;
        }

        setting.appendChild(title);
        setting.appendChild(helpText);

        title.firstElementChild.dataset.settingName = name;
        title.firstElementChild.id = `setting-input-${name}`

        if (!storage[name]) {
            storage[name] = defaultValue;
        }

        if (onload) {
            title.firstElementChild.value = onload(storage[name]) || this.default;
        } else {
            title.firstElementChild.value = storage[name] || this.default;
        }

        return setting;
    }
    settings[name] = this;
}

/**
 * Stringifies an object and saves it to storage
 * @param {string} key Name of the setting
 * @param {Object.<string,any>} value Value of the setting
 */
Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
}

/**
 * Parses a saved object and returns it
 * @param {string} key Name of the setting
 * @returns {Object.<string,any>} Returns the parsed version of the stored object
 */
Storage.prototype.getObject = function (key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
}


/**
 * Asynchronously pulls the requisite data from the DOM to retrieve this user's Schoology API key, reloading the page if need be.
 * @returns an array of 3 elements: the key, the secret, and the user ID.
 */
async function getApiKeys() {
    let userId = document.querySelector("#profile > a").href.match(/\d+/)[0];
    var apiKeys = null;
    console.log(`Fetching API key for user ${userId}`);
    let html = await (await fetch("https://lms.lausd.net/api", { credentials: "same-origin" })).text();
    let docParser = new DOMParser();
    let doc = docParser.parseFromString(html, "text/html");

    let key;
    let secret;
    if ((key = doc.getElementById("edit-current-key")) && (secret = doc.getElementById("edit-current-secret"))) {
        console.log("API key already generated - storing");
        apiKeys = [key.value, secret.value, userId];
    } else {
        console.log("API key not found - generating and trying again");
        let submitData = new FormData(doc.getElementById("s-api-register-form"));
        let generateFetch = await fetch("https://lms.lausd.net/api", { 
            credentials: "same-origin",
            body: submitData,
            method: "post" });
        console.log(`Generatekey response: ${generateFetch.status}`);
        return await getApiKeys();
    }

    return apiKeys;
}

/**
 * Given an apiKeys array, generate the authentication headers for an API request.
 * 
 * @param {string[]} apiKeys The apiKeys array, consisting of at least the key and the secret, returned from getApiKeys.
 * @param {Object.<string,any>} baseObj Optional: the base object from which to copy existing properties.
 * @returns {Object.<string,string>} A dictionary of HTTP headers, including a properly-constructed Authorization header for the given API user.
 */
function createApiAuthenticationHeaders(apiKeys, baseObj) {
    let retObj = {};
    if (baseObj) {
        Object.assign(retObj, baseObj);
    }

    let userAPIKey = apiKeys[0];
    let userAPISecret = apiKeys[1];

    retObj["Authorization"] = `OAuth realm="Schoology%20API",oauth_consumer_key="${userAPIKey}",oauth_signature_method="PLAINTEXT",oauth_timestamp="${Math.floor(Date.now() / 1000)}",oauth_nonce="${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}",oauth_version="1.0",oauth_signature="${userAPISecret}%26"`;

    if (!retObj["Content-Type"]) {
        retObj["Content-Type"] = "application/json";
    }

    return retObj;
}