/**
 * Wrapper for various `console` functions. Each adds a custom prefix to the start of the log message.
 */
var Logger = {
    /**
     * Logs each argument to the console. Provides identical functionality to `console.log`, but WITHOUT format specifiers. 
     * @type {(...args)=>void}
     */
    log: (() => console.log.bind(window.console, `%c+`, createLogPrefix("#81D4FA")))(),
    /**
     * Logs each argument to the console ("error" log level). Provides identical functionality to `console.error`, but WITHOUT format specifiers. 
     * @type {(...args)=>void}
     */
    error: (() => console.error.bind(window.console, `%c+`, createLogPrefix("#FF6961")))(),
    /**
     * Logs each argument to the console ("info" log level). Provides identical functionality to `console.info`, but WITHOUT format specifiers. 
     * @type {(...args)=>void}
     */
    info: (() => console.info.bind(window.console, `%c+`, createLogPrefix("white")))(),
    /**
     * Logs each argument to the console ("warning" log level). Provides identical functionality to `console.warn`, but WITHOUT format specifiers. 
     * @type {(...args)=>void}
     */
    warn: (() => console.warn.bind(window.console, `%c+`, createLogPrefix("#FDFD96")))(),
    /**
     * Logs each argument to the console ("info" log level). Provides identical functionality to `console.trace`, but WITHOUT format specifiers. 
     * @type {(...args)=>void}
     */
    trace: (() => console.trace.bind(window.console, `%c+`, createLogPrefix("orange")))(),
    /**
     * Logs each argument to the console ("debug" log level). Provides identical functionality to `console.trace`, but WITHOUT format specifiers. 
     * @type {(...args)=>void}
     */
    debug: (() => console.debug.bind(window.console, `%c+`, createLogPrefix("lightgreen")))(),
}

// Process options
Logger.log(`Loaded Schoology Plus version ${chrome.runtime.getManifest().version}${getBrowser() != "Chrome" || chrome.runtime.getManifest().update_url ? '' : ' (development version)'}`);
var firstLoad = true;
updateSettings();

var defaultCourseIconUrlRegex = /\/sites\/[a-zA-Z0-9_-]+\/themes\/[%a-zA-Z0-9_-]+\/images\/course-default.(?:svg|png|jpe?g|gif)(\?[a-zA-Z0-9_%-]+(=[a-zA-Z0-9_%-]+)?(&[a-zA-Z0-9_%-]+(=[a-zA-Z0-9_%-]+)?)*)?$/;

// Functions

/** @type {HTMLDivElement} */
var modalContents;

function getModalContents() {
    return modalContents;
}

function backgroundPageFetch(url, init, bodyReadType) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "fetch", url: url, params: init, bodyReadType: bodyReadType }, function (response) {
            if (!response.success) {
                reject(response.error);
                return;
            }

            delete response.success;

            let bodyReadError = response.bodyReadError;
            delete response.bodyReadError;

            let bodyContent = response[bodyReadType];
            let readBodyTask = new Promise((readBodyResolve, readBodyReject) => {
                if (bodyReadError) {
                    if (bodyReadError === true) {
                        readBodyReject();
                    } else {
                        readBodyReject(bodyReadError);
                    }
                } else {
                    readBodyResolve(bodyContent);
                }
            });
            response[bodyReadType] = () => readBodyTask;

            resolve(response);
        });
    });
}

/**
 * Creates a fetch function wrapper which honors a rate limit.
 * 
 * @returns {(input: RequestInfo, init?: RequestInit)=>Promise<Response>} A function following the fetch contract.
 * @example
 * // 10 requests per 3 seconds
 * var rateLimitedFetch = createFetchRateLimitWrapper(10, 3000);
 * rateLimitedFetch("https://www.google.com/").then(x => Logger.log(x))
 * @param {number} requestsPerInterval The number of requests per time interval permitted by the rate limit.
 * @param {number} interval The amount of time, in milliseconds, that the rate limit is delineated in.
 */
function createFetchRateLimitWrapper(requestsPerInterval, interval) {
    let callsThisCycle = 0;

    // array of resolve callbacks which trigger the request to be reenqueued
    let queue = [];

    function onIntervalReset() {
        callsThisCycle = 0;
        let countToDequeue = queue.length;
        if (countToDequeue) {
            Logger.log("Processing " + countToDequeue + " ratelimit-delayed queued requests");
        }
        for (let i = 0; i < countToDequeue; i++) {
            // note that this resolution might trigger stuff to be added to the queue again
            // that's why we store length before we iterate
            queue[i]();
        }
        // remove everything we just dequeued and executed
        queue.splice(0, countToDequeue);
    }

    function rateLimitedFetch() {
        if (callsThisCycle == 0) {
            setTimeout(onIntervalReset, interval);
        }

        if (callsThisCycle < requestsPerInterval) {
            callsThisCycle++;
            return backgroundPageFetch.apply(this, arguments);
        } else {
            // enqueue the request
            // basically try again later
            let resolvePromiseFunc;

            let realThis = this;
            let realArgs = arguments;

            let returnPromise = new Promise((resolve, reject) => {
                resolvePromiseFunc = resolve;
            }).then(() => rateLimitedFetch.apply(realThis, realArgs));

            queue.push(resolvePromiseFunc);

            return returnPromise;
        }
    }

    return rateLimitedFetch;
}

var preload_globallyCachedApiKeys = null;
// real limit is 15/5s but we want to be conservative
var preload_schoologyPlusApiRateLimitedFetch = createFetchRateLimitWrapper(13, 5000);

/**
 * Fetches data from the Schoology API (v1).
 * @returns {Promise<Response>} The response object from the Schoology API.
 * @param {string} path The API path, e.g. "/sections/12345/assignments/12"
 */
function fetchApi(path) {
    return fetchWithApiAuthentication(`https://api.schoology.com/v1/${path}`);
}

/**
 * Fetches a URL with Schoology API authentication headers for the current user.
 * @returns {Promise<Response>}
 * @param {string} url The URL to fetch.
 * @param {Object.<string, string>} [baseObj] The base set of headers. 
 * @param {boolean} [useRateLimit=true] Whether or not to use the internal Schoology API rate limit tracker. Defaults to true.
 * @param {string} [bodyReadType="json"] The method with which the body should be read.
 */
async function fetchWithApiAuthentication(url, baseObj, useRateLimit = true, bodyReadType = "json") {
    return await (useRateLimit ? preload_schoologyPlusApiRateLimitedFetch : backgroundPageFetch)(url, {
        headers: createApiAuthenticationHeaders(await getApiKeysInternal(), baseObj)
    }, bodyReadType);
}

/**
 * Fetches and parses JSON data from the Schoology API (v1).
 * @returns {Promise<object>} The parsed response from the Schoology API.
 * @param {string} path The API path, e.g. "/sections/12345/assignments/12"
 */
async function fetchApiJson(path) {
    return await (await fetchApi(path)).json();
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
            if (properties[property] instanceof Object && !(properties[property] instanceof Function)) {
                for (let subproperty in properties[property]) {
                    element[property][subproperty] = properties[property][subproperty];
                }
            } else if (property !== undefined && properties[property] !== undefined) {
                element[property] = properties[property];
            }
        }
    }
    if (children) {
        for (let child of children) {
            element.appendChild(child);
        }
    }
    return element;
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

/** Attempts to return the reference to the cached API key data.
 * Otherwise, asynchronously pulls the requisite data from the DOM to retrieve this user's Schoology API key, reloading the page if need be.
 * @returns {Promise<string[]>} an array of 3 elements: the key, the secret, and the user ID.
 */
async function getApiKeysInternal() {
    if (preload_globallyCachedApiKeys && preload_globallyCachedApiKeys.length !== undefined) {
        // API key object exists (truthy) and is an array (load completed)
        return preload_globallyCachedApiKeys;
    } else if (preload_globallyCachedApiKeys && preload_globallyCachedApiKeys.then !== undefined) {
        // API key variable is a promise, which will resolve to have API keys
        // await it
        // we don't have to worry about variable reassignment because the callbacks set up when the fetch was started will do that
        return await preload_globallyCachedApiKeys;
    } else {
        // API keys not yet retrieved
        // retrieve them
        preload_globallyCachedApiKeys = getApiKeysDirect();
        let retrievedApiKeys = await preload_globallyCachedApiKeys;
        // add to cache
        preload_globallyCachedApiKeys = retrievedApiKeys;
        return preload_globallyCachedApiKeys;
    }
}

/**
 * Attempts to return a defensive copy of cached API key data.
 * Otherwise, asynchronously pulls the requisite data from the DOM to retrieve this user's Schoology API key, reloading the page if need be.
 * @returns {Promise<string[]>} an array of 3 elements: the key, the secret, and the user ID.
 */
async function getApiKeys() {
    return (await getApiKeysInternal()).splice(0);
}

/**
 * Gets the current user's ID.
 */
function getUserId() {
    try {
        return Number.parseInt(new URLSearchParams(document.querySelector("iframe[src*=session-tracker]").src.split("?")[1]).get("id"));
    } catch (e) {
        Logger.warn("Failed to get user ID from session tracker, using backup", e);
        try {
            return JSON.parse(document.querySelector("script:not([type]):not([src])").textContent.split("=")[1]).props.user.uid;
        } catch (e2) {
            Logger.error("Failed to get user ID from backup method", e2);
            throw new Error("Failed to get user ID from backup method: " + e2.toString());
        }
    }
}

/**
 * Gets the user's API credentials from the Schoology API key webpage, bypassing the cache.
 */
async function getApiKeysDirect() {
    let userId = getUserId();
    var apiKeys = null;
    Logger.log(`Fetching API key for user ${userId}`);
    let html = await (await fetch("https://lms.lausd.net/api", { credentials: "same-origin" })).text();
    let docParser = new DOMParser();
    let doc = docParser.parseFromString(html, "text/html");

    let key;
    let secret;
    if ((key = doc.getElementById("edit-current-key")) && (secret = doc.getElementById("edit-current-secret"))) {
        Logger.log("API key already generated - storing");
        apiKeys = [key.value, secret.value, userId];
    } else {
        Logger.log("API key not found - generating and trying again");
        let submitData = new FormData(doc.getElementById("s-api-register-form"));
        let generateFetch = await fetch("https://lms.lausd.net/api", {
            credentials: "same-origin",
            body: submitData,
            method: "post"
        });
        Logger.log(`Generatekey response: ${generateFetch.status}`);
        return await getApiKeysDirect();
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

/** @type {Object.<string,any>} */
let __storage = {};

/**
 * Updates the contents of the settings modal to reflect changes made by the user to all settings
 * @param {()=>any} callback Called after settings are updated
 */
function updateSettings(callback) {
    chrome.storage.sync.get(null, storageContents => {
        __storage = storageContents;

        // wrapper functions for e.g. defaults
        __storage.getGradingScale = function (courseId) {
            let defaultGradingScale = { "90": "A", "80": "B", "70": "C", "60": "D", "0": "F" };
            if (__storage.gradingScales && __storage.gradingScales[courseId]) {
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
                ).control,
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
                ).control,
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
                    "upcomingOverdueVisibility",
                    "Hide Upcoming and Overdue Assignments",
                    'Hides the "Upcoming" and "Overdue" sidebars on the homepage',
                    "showAll",
                    "select",
                    {
                        options: [
                            {
                                text: "Show Both",
                                value: "showAll"
                            },
                            {
                                text: "Hide Upcoming Only",
                                value: "hideUpcoming"
                            },
                            {
                                text: "Hide Overdue Only",
                                value: "hideOverdue"
                            },
                            {
                                text: "Hide Both",
                                value: "hideAll"
                            }
                        ]
                    },
                    value => {
                        setCSSVariable("overdue-assignments-display", "block");
                        setCSSVariable("upcoming-assignments-display", "block");
                        switch(value) {
                            case "hideUpcoming":
                                setCSSVariable("upcoming-assignments-display", "none");
                                break;
                            case "hideOverdue":
                                setCSSVariable("overdue-assignments-display", "none");
                                break;
                            case "hideAll":
                                setCSSVariable("upcoming-assignments-display", "none");
                                setCSSVariable("overdue-assignments-display", "none");
                                break;
                        }
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
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
                new Setting(
                    "helpCenterFAB",
                    "Schoology Help Button",
                    "Controls the visibility of the S button in the bottom right that shows the Schoology Guide Center",
                    "hidden",
                    "select",
                    {
                        options: [
                            {
                                text: "Show",
                                value: "visible"
                            },
                            {
                                text: "Hide",
                                value: "hidden"
                            }
                        ]
                    },
                    value => {
                        setCSSVariable("help-center-fab-visibility", value);
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
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
                ).control
            ]),
            createElement("div", ["settings-buttons-wrapper"], undefined, [
                createButton("save-settings", "Save Settings", () => Setting.saveModified()),
                createElement("a", ["restore-defaults"], { textContent: "Restore Defaults", onclick: Setting.restoreDefaults, href: "#" })
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
let __settings = {};

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
 */
function Setting(name, friendlyName, description, defaultValue, type, options, onload, onmodify, onsave) {
    this.name = name;
    this.getElement = () => document.getElementById(`setting-input-${this.name}`);
    this.onmodify = onmodify;
    this.onsave = onsave;
    this.onload = onload;
    this.modified = false;
    this.default = defaultValue;
    /**
     * Returns the element control to be used to edit the setting's value by the user
     * @returns {HTMLElement} A setting element
     */
    this.control = (() => {
        let setting = createElement("div", ["setting-entry"]);
        let title = createElement("h2", ["setting-title"], { textContent: friendlyName + ": " });
        let helpText = createElement("p", ["setting-description"], { textContent: description });

        switch (type) {
            case "number":
            case "text":
            case "button":
                let inputElement = createElement("input", undefined, Object.assign({ type: type }, options));
                title.appendChild(inputElement);
                if (type == "button") inputElement.onclick = Setting.onModify;
                else inputElement.oninput = Setting.onModify;
                break;
            case "select":
                let selectElement = createElement("select");
                for (let option of options.options) {
                    selectElement.appendChild(createElement("option", undefined, { textContent: option.text, value: option.value }));
                }
                title.appendChild(selectElement);
                selectElement.onchange = Setting.onModify;
                break;
        }

        setting.appendChild(title);
        setting.appendChild(helpText);

        title.firstElementChild.dataset.settingName = name;
        title.firstElementChild.id = `setting-input-${name}`

        if (!__storage[name]) {
            __storage[name] = defaultValue;
        }

        if (onload) {
            title.firstElementChild.value = onload(__storage[name]) || this.default;
        } else {
            title.firstElementChild.value = __storage[name] || this.default;
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
Setting.saveModified = function (modifiedValues, updateButtonText = true, callback = undefined, saveUiSettings = true) {
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
        for (let setting in __settings) {
            delete __storage[setting];
            chrome.storage.sync.remove(setting);
            __settings[setting].onload(undefined, __settings[setting].getElement());
        }
        location.reload();
    }
}

/**
 * Callback function called when any setting is changed in the settings menu
 * @param {Event} event Contains a `target` setting element
 */
Setting.onModify = function (event) {
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

/**
 * @returns {boolean} `true` if any setting has been modified
 */
Setting.anyModified = function () {
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
 * default value of that setting will be returned instead
 * @param {string} name The name of the setting to retrieve
 * @returns {any} The setting's cached value, default value, or `undefined`
 */
Setting.getValue = function (name) {
    if (__storage[name]) {
        return __storage[name];
    } else if (__settings[name]) {
        return __settings[name].default;
    }
    return undefined;
}

/**
 * Sets the value of a setting in the extension's synced storage
 * Even if `name` is the name of a `Setting`, that `Setting`'s `onmodify`
 * function will NOT be called.
 * @param {string} name The name of the setting to set the value of
 * @param {any} value The value to set
 * @param {()=>any} callback Function called after new value is saved
 */
Setting.setValue = function (name, value, callback = undefined) {
    Setting.saveModified({ [name]: value }, false, callback, false);
}

/**
 * Sets the value of multiple settings in the extension's synced storage
 * Even if a dictionary key is the name of a `Setting`, that `Setting`'s `onmodify`
 * function will NOT be called.
 * @param {Object.<string,any>} dictionary Dictionary of setting names to values
 * @param {()=>any} callback Function called after new values are saved
 */
Setting.setValues = function (dictionary, callback = undefined) {
    Setting.saveModified(dictionary, false, callback, false);
}

function createLogPrefix(color) {
    return `color:${color};border:1px solid #2A2A2A;border-radius:100%;font-size:14px;font-weight:bold;padding: 0 4px 0 4px;background-color:#2A2A2A`;
}

/**
 * Sets the value of a CSS variable on the document
 * @param {string} name Variable name 
 * @param {string} val New variable value
 */
function setCSSVariable(name, val) {
    document.documentElement.style.setProperty(`--${name}`, val);
}