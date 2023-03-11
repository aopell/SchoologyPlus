(async function () {
    // Wait for loader.js to finish running
    while (!window.splusLoaded) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    await loadDependencies("preload", ["loader"]);
})();

// Process options
Logger.log(`Loaded Schoology Plus version ${chrome.runtime.getManifest().version}${getBrowser() != "Chrome" || chrome.runtime.getManifest().update_url ? '' : ' (development version)'}`);
var firstLoad = true;
document.documentElement.setAttribute("page", location.pathname);

updateSettings();

var beta_tests = {
    // "darktheme": "https://schoologypl.us/docs/beta/darktheme",
    "newgrades": "https://schoologypl.us"
};

var defaultCourseIconUrlRegex = /\/sites\/[a-zA-Z0-9_-]+\/themes\/[%a-zA-Z0-9_-]+\/images\/course-default.(?:svg|png|jpe?g|gif)(\?[a-zA-Z0-9_%-]+(=[a-zA-Z0-9_%-]+)?(&[a-zA-Z0-9_%-]+(=[a-zA-Z0-9_%-]+)?)*)?$/;

// Functions

/** @type {HTMLDivElement} */
var modalContents = undefined;

function getModalContents() {
    return modalContents || createElement("p", [], { textContent: "Error loading settings" });
}

function backgroundPageFetch(url, init, bodyReadType) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "fetch", url: url, params: init, bodyReadType: bodyReadType }, function (response) {
            if (response === undefined || response === null) {
                Logger.error("[backgroundPageFetch] Response is undefined or null", response, chrome.runtime.lastError);
                reject("Response is undefined or null. Last error: " + chrome.runtime.lastError);
            }
            response = JSON.parse(response);
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
                        readBodyReject({ status: response.status, bodyReadError: bodyReadError });
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
    let response;
    try {
        response = await fetchApi(path);
    }
    catch (err) {
        throw err;
    }
    if (!response.ok) {
        throw response;
    }
    return await response.json();
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
    return createElement("span", ["submit-span-wrapper", "splus-modal-button"], { onclick: callback }, [createElement("input", ["form-submit", "splus-track-clicks"], { type: "button", value: text, id: id, dataset: { splusTrackingContext: "S+ Button" } })]);
}

/**
 * Returns the name of the current browser
 * @returns {"Chrome"|"Firefox"|"Other"} Name of the current browser
 */
function getBrowser() {
    if (typeof chrome !== "undefined") {
        if (typeof browser !== "undefined") {
            return "Firefox";
        } else {
            // Likely captures all Chromium-based browsers
            return "Chrome";
        }
    } else {
        return "Other";
    }
}

/**
 * Returns `true` if current domain is `lms.lausd.net`
 * @returns {boolean}
 */
function isLAUSD() {
    return Setting.getValue("defaultDomain") === "lms.lausd.net";
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
    let apiKey = Setting.getValue("apikey");
    let apiSecret = Setting.getValue("apisecret");
    let apiUserId = Setting.getValue("apiuser");
    let currentUser = getUserId();
    let apiStatus = Setting.getValue("apistatus");

    if (apiStatus === "denied" && apiUserId === currentUser) {
        throw "apidenied";
    }

    if (apiKey && apiSecret && apiUserId === currentUser) {
        // API keys already exist
        return [apiKey, apiSecret, apiUserId];
    }

    // API keys do not exist
    throw "noapikey";
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
            createElement("div", ["splus-modal-contents"], {}, [
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
                            ).map(t => {return {text: t.name, value: t.name}}),
                            ...(__storage.themes || []).map(
                                t => {return {text: t.name, value: t.name}}
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
                    "quickAccessVisibility",
                    "Quick Access",
                    "[Reload Required to Reposition] Changes the visibility of the Quick Access panel on the homepage",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Top of Right Sidebar",
                                value: "enabled"
                            },
                            {
                                text: "Between Overdue and Upcoming",
                                value: "belowOverdue"
                            },
                            {
                                text: "Bottom of Right Sidebar",
                                value: "bottom"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => {
                        setCSSVariable("quick-access-display", value === "disabled" ? "none" : "block");
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
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
                        switch (value) {
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
                ).control,
                createElement("div", ["setting-entry"], {}, [
                    createElement("h2", ["setting-title"], {}, [
                        createElement("a", [], { href: "#", textContent: "Change Schoology Account Access", onclick: () => {location.pathname = "/api";}, style: { fontSize: "" } })
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
        let helpText = createElement("p", ["setting-description"], { innerHTML: description });

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
        } catch (err) {
            alert("Failed to import settings! They were probably malformed. Make sure the settings are valid JSON.");
            return;
        }

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
 * default value of that setting will be returned instead (unless `defaultValue` is passed)
 * @param {string} name The name of the setting to retrieve
 * @param {any} defaultValue The default value to return if no value is specifically set
 * @returns {any} The setting's cached value, default value, or `defaultValue`
 */
Setting.getValue = function (name, defaultValue = undefined) {
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
Setting.getNestedValue = function (parent, key, defaultValue = undefined) {
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
Setting.setValue = function (name, value, callback = undefined) {
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
Setting.setNestedValue = function (parent, key, value, callback = undefined) {
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
Setting.setValues = function (dictionary, callback = undefined) {
    Setting.saveModified(dictionary, false, callback, false);
}

/**
 * Sets the value of a CSS variable on the document
 * @param {string} name Variable name 
 * @param {string} val New variable value
 */
function setCSSVariable(name, val) {
    document.documentElement.style.setProperty(`--${name}`, val);
}

function createSvgLogo(...classes) {
    let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", 250);
    circle.setAttribute("cy", 250);
    circle.setAttribute("r", 230);
    circle.setAttribute("style", "fill: none; stroke-width: 35px; stroke: currentColor;");
    let line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", 250);
    line1.setAttribute("y1", 125);
    line1.setAttribute("x2", 250);
    line1.setAttribute("y2", 375);
    line1.setAttribute("style", "stroke-linecap: round; stroke-width: 35px; stroke: currentColor;");
    let line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", 125);
    line2.setAttribute("y1", 250);
    line2.setAttribute("x2", 375);
    line2.setAttribute("y2", 250);
    line2.setAttribute("style", "stroke-linecap: round; stroke-width: 35px; stroke: currentColor;");

    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 500 500");

    svg.append(circle, line1, line2);

    if (classes) {
        svg.classList.add(...classes);
    }

    return svg;
}

new Setting(
    "defaultDomain",
    "Default Schoology Domain",
    "The website on which Schoology Plus runs. Cannot be changed here.",
    "app.schoology.com",
    "text",
    {
        disabled: true
    },
    value => value,
    undefined,
    element => element.value
);

Logger.debug("Finished loading preload.js");