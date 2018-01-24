// Process options
updateSettings();

// Functions

var modalContents;
function getModalContents() {
    return modalContents;
}

/**
 * Creates a DOM element
 * @returns {HTMLElement} A DOM element
 * @param {string} tag - The HTML tag name of the type of DOM element to create
 * @param {string[]} classList - CSS classes to apply to the DOM element
 * @param {Object} properties - Properties to apply to the DOM element
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

let storage = {};

function updateSettings() {
    chrome.storage.sync.get(null, storageContents => {
        storage = storageContents;

        modalContents = createElement("div", ["modal-contents"], undefined, [
            createSetting(
                "theme",
                "Theme",
                "Set a color theme for the schoology website",
                "select",
                {
                    options: themes.map(x => ({ text: x.name, value: x.name }))
                },
                (value, element) => {
                    tempTheme = undefined;
                    element.value = value || "Custom";
                    Theme.apply(Theme.active);
                },
                event => {
                    tempTheme = event.target.value;
                    Theme.apply(Theme.active);
                },
                element => element.value
            ),
            createSetting(
                "color",
                "Color Hue",
                "[Custom theme only] An HSL hue to be used as the color for the navigation bar (0-359)",
                "number",
                { min: 0, max: 359, value: 210 },
                (value, element) => {
                    if (Theme.active.name == "Custom") {
                        Theme.setBackgroundHue(value || value === 0 ? value : 210);
                    }
                    element.value = value || value === 0 ? value : 210;
                },
                event => Theme.setBackgroundHue(event.target.value),
                element => Number.parseInt(element.value)
            ),
            createSetting(
                "notifications",
                "Desktop Notifications",
                "Displays desktop notifications and a number badge on the extension button when new grades are entered",
                "select",
                {
                    options: [
                        {
                            text: "Number Badge and Desktop Notifications",
                            value: "enabled"
                        },
                        {
                            text: "Number Badge Only",
                            value: "badge"
                        },
                        {
                            text: "Desktop Notifications Only",
                            value: "popup"
                        },
                        {
                            text: "Disabled",
                            value: "disabled"
                        }
                    ]
                },
                (value, element) => element.value = value || "enabled",
                undefined,
                element => element.value
            ),
            createElement("div", ["settings-buttons-wrapper"], undefined, [
                createElement("span", ["submit-span-wrapper", "modal-button"], { onclick: saveSettings }, [createElement("input", ["form-submit"], { type: "button", value: "Save Settings", id: "save-settings" })]),
                createElement("a", ["restore-defaults"], { textContent: "Restore Defaults", onclick: restoreDefaults, href: "#" })
            ])
        ]);
    });
}

let settings = {};

/**
 * Creates a setting, appends it to the settings list, and returns a DOM representation of the setting
 * @returns {HTMLElement}
 * @param {string} name - The name of the setting, to be stored in extension settings
 * @param {string} friendlyName - The display name of the setting
 * @param {string} description - A description of the setting and appropriate values
 * @param {string} type - Setting control type, one of ["number", "text", "button", "select"]
 * @param {Object|Object[]} options Additional options, format dependent on setting **type**
 * - **number, text, button**: Directly applied as element properties
 * - **select**: *options* property on ***options*** object should be an array of objects containing *text* and *value* properties
 * @param {function(any,HTMLElement):void} onLoad Called with the setting's current value and the element used to display the setting value when the page is loaded and when the setting is changed
 * - *This function should update the setting's display element appropriately so that the setting value is displayed*
 * - *This function should return the default value of the setting when the first argument is undefined*
 * @param {function(any):void} previewCallback Function called when setting value is changed
 * - *Should be used to show how changing the setting affects the page if applicable*
 * @param {function(HTMLElement):any} saveCallback Function called when setting is saved
 * - First argument is the HTML element containing the setting value set by the user
 * - Must return the value to be saved to extension settings
 * - Will only be called if user saves settings and setting was modified
 */
function createSetting(name, friendlyName, description, type, options, onLoad, previewCallback, saveCallback) {

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
    onLoad(storage[name], title.firstElementChild);

    settings[name] = {
        element: title.firstElementChild,
        onmodify: previewCallback,
        onsave: saveCallback,
        onload: onLoad,
        modified: false
    };

    return setting;
}

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

function anySettingsModified() {
    for (let setting in settings) {
        if (settings[setting].modified) {
            return true;
        }
    }
    return false;
}

function saveSettings() {
    let newValues = {};
    for (let setting in settings) {
        let v = settings[setting];
        if (v.modified) {
            let value = v.onsave(v.element);
            newValues[setting] = value;
            storage[setting] = value;
            v.onload(value, v.element);
            v.modified = false;
        }
    }
    chrome.storage.sync.set(newValues, () => {
        for (let element of document.querySelectorAll(".setting-modified")) {
            element.parentElement.removeChild(element);
        }
    });

    let settingsSaved = document.getElementById("save-settings");
    settingsSaved.value = "Saved!";
    setTimeout(() => {
        settingsSaved.value = "Save Settings";
    }, 2000);
}

function restoreDefaults() {
    if (confirm("Are you sure you want to delete all settings?\nTHIS CANNOT BE UNDONE")) {
        for (let setting in settings) {
            delete storage[setting];
            chrome.storage.sync.remove(setting);
            settings[setting].onload(undefined, settings[setting].element);
        }
    }
}