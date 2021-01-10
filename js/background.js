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
     * Logs each argument to the console ("debug" log level). Provides identical functionality to `console.debug`, but WITHOUT format specifiers. 
     * @type {(...args)=>void}
     */
    debug: (() => console.debug.bind(window.console, `%c+`, createLogPrefix("lightgreen")))(),
}

var assignmentNotificationUrl = "https://app.schoology.com/home/notifications?filter=all";
var defaultDomain = "app.schoology.com";

chrome.storage.sync.get({ defaultDomain: "app.schoology.com" }, s => {
    defaultDomain = s.defaultDomain;
    assignmentNotificationUrl = `https://${defaultDomain}/home/notifications?filter=all`;
});

chrome.runtime.onInstalled.addListener(function (details) {
    // TODO: Open window here to ask new users to select their domain
    // chrome.tabs.create({ url: "https://schoologypl.us" })
    trackEvent("Runtime onInstalled", details.reason, "Versions");
});

Logger.log("Loaded event page");
Logger.log("Adding alarm listener");
chrome.alarms.onAlarm.addListener(onAlarm);
Logger.log("Adding notification listener");
chrome.notifications.onClicked.addListener(function (id) {
    Logger.log("Notification clicked");
    trackEvent(id, "notification click", "Notifications");
    chrome.notifications.clear(id, null);
    switch (id) {
        case "assignment":
            chrome.tabs.create({ url: `https://${defaultDomain}/home/notifications` }, null);
            chrome.browserAction.setBadgeText({ text: "" });
            break;
        default:
            chrome.tabs.create({ url: `https://${defaultDomain}` });
            break;
    }
});
chrome.browserAction.setBadgeBackgroundColor({ color: [217, 0, 0, 255] });
Logger.log("Adding browser action listener");
chrome.browserAction.onClicked.addListener(function () {
    Logger.log("Browser action clicked");
    chrome.browserAction.getBadgeText({}, x => {
        let n = Number.parseInt(x);
        trackEvent("Browser Action", n ? `browser action clicked: ${n}` : "browser action clicked: 0", "Notifications");
        Logger.log(`Browser action text: "${x}"`);
        if (n) chrome.tabs.create({ url: `https://${defaultDomain}/home/notifications` }, null);
        else chrome.tabs.create({ url: `https://${defaultDomain}` }, null);
        chrome.browserAction.setBadgeText({ text: "" });
    });
});
Logger.log("Adding cookie change listener");
chrome.cookies.onChanged.addListener(function (changeInfo) {
    if (changeInfo.cookie.domain == `.${defaultDomain}` && changeInfo.cookie.name.startsWith("SESS")) {
        chrome.storage.sync.get({ sessionCookiePersist: "disabled" }, settings => {
            let rewriteCookie = false;
            if (settings.sessionCookiePersist == "enabled") {
                if (changeInfo.removed && (changeInfo.cause == "evicted" || changeInfo.cause == "expired")) {
                    Logger.log("Overriding implicit Schoology session token removal");
                    rewriteCookie = true;
                } else if (!changeInfo.removed && changeInfo.cookie.session) {
                    Logger.log("Overriding session-only Schoology session cookie with persistence");
                    rewriteCookie = true;
                }
            }

            if (!rewriteCookie) {
                return;
            }

            // expire in roughly 2 months (we need this so we don't become a session cookie)
            let expiryTime = new Date(new Date().setDate(new Date().getDate() + 60));

            let cookie = changeInfo.cookie;
            cookie.url = `https://${defaultDomain}/`;
            delete cookie.session;
            delete cookie.hostOnly;
            cookie.expirationDate = expiryTime.getTime() / 1000;

            chrome.cookies.set(cookie, setCookie => {
                if (!setCookie) {
                    Logger.warn("Error overriding Schoology session cookie");
                } else {
                    Logger.debug("Successfully overrode Schoology session cookie");
                }
            })
        })
    }
});

Logger.log("Adding HTTP request command listener");
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.type == "fetch" && request.url !== undefined) {
            Logger.debug("Received fetch request for " + request.url);

            (async function () {
                let finalResponse = {};
                let responseObj;
                try {
                    responseObj = await fetch(request.url, request.params);
                } catch (e) {
                    finalResponse.success = false;
                    finalResponse.error = e;
                    return finalResponse;
                }

                finalResponse.success = true;

                finalResponse.headers = responseObj.headers;
                finalResponse.ok = responseObj.ok;
                finalResponse.redirected = responseObj.redirected;
                finalResponse.status = responseObj.status;
                finalResponse.statusText = responseObj.statusText;
                finalResponse.type = responseObj.type;
                finalResponse.url = responseObj.url;
                finalResponse.useFinalURL = responseObj.useFinalURL;

                try {
                    switch (request.bodyReadType) {
                        case "json":
                            finalResponse.json = await responseObj.json();
                            break;
                        case "text":
                            finalResponse.text = await responseObj.text();
                            break;
                    }
                } catch (e) {
                    finalResponse.bodyReadError = e || true;
                }

                return finalResponse;
            })().then(x => sendResponse(JSON.stringify(x))).catch(err => sendResponse(JSON.stringify({ success: false, error: err })));

            return true;
        } else if (request.type == "updateDefaultDomain" && request.domain !== undefined) {
            defaultDomain = request.domain;
            assignmentNotificationUrl = `https://${defaultDomain}/home/notifications?filter=all`;
        }
    }
);

chrome.alarms.get("notification", function (alarm) {
    if (alarm) {
        Logger.log("Alarm is already registered");
    } else {
        Logger.log("Notifications alarm is not registered; registering...");
        chrome.alarms.create("notification", {
            periodInMinutes: 5
        });
    }
});

//Run once on load
onAlarm({ name: "notification" });

/**
 * Sends a desktop notification if settings permit
 * @param {NotificationOptions} notification A chrome notification object
 * @param {string} name The name of the notification
 * @param {number} [count=1] The number to add to the browser action badge
 */
function sendNotification(notification, name, count) {
    chrome.storage.sync.get(null, function (storageContent) {
        count = (count || count == 0) ? count : 1;
        if (getBrowser() == "Firefox") {
            delete notification.requireInteraction;
        }
        Logger.log("New notification!", notification);

        if (count > 0 && (!storageContent.notifications || storageContent.notifications == "enabled" || storageContent.notifications == "badge")) {
            chrome.browserAction.getBadgeText({}, x => {
                let num = Number.parseInt(x);
                chrome.browserAction.setBadgeText({ text: (num ? num + count : count).toString() });
            });
        } else {
            Logger.log("Number badge is disabled");
        }
        if (!storageContent.notifications || storageContent.notifications == "enabled" || storageContent.notifications == "popup") {
            chrome.notifications.create(name, notification, null);
            trackEvent(name, "shown", "Notifications");
        } else {
            Logger.log("Popup notifications are disabled");
        }
    });
}

function onAlarm(alarm) {
    chrome.storage.sync.get(null, function (storageContent) {
        if (alarm && alarm.name === "notification") {
            try {
                Logger.log(`[${new Date()}] Checking for new notifications`);
                if (storageContent.notifications != "disabled") {
                    loadAssignmentNotifications(storageContent);
                }
            } catch (error) {
                Logger.error("Error caught:");
                Logger.error(error);
            }
        }
    });
}

function loadAssignmentNotifications(storageContent) {
    fetch(assignmentNotificationUrl, {
        credentials: "same-origin"
    }).then(function (response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error("Error loading notifications: " + response);
    }).then(function (response) {
        Logger.log("Last new grade: " + new Date(storageContent.lastTime).toString());
        let time = storageContent.lastTime;
        let timeModified = false;
        if (!time) {
            time = Date.now();
            timeModified = true;
        }
        let div = document.querySelector("div") || document.body.appendChild(document.createElement("div"));
        div.innerHTML = DOMPurify.sanitize(response.output);
        let notifications = div.querySelectorAll(".edge-sentence");
        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let totalAssignments = 0;
        for (let notification of Array.from(notifications).reverse()) {
            if (notification.textContent.includes("new grade")) {
                let assignments = notification.getElementsByTagName("a");
                let extraTextElement = notification.querySelector(".other-items-link");
                let timeText = notification.querySelector(".edge-time").textContent;
                let splitDate = timeText.split(" at ");
                let monthDay = splitDate[0];
                let hourMinute = splitDate[1];
                let now = new Date();
                let monthDayYear = monthDay + ` ${now.getFullYear()}`;
                let today = `${months[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`;
                let notificationDate = Date.parse(monthDayYear);
                if (notificationDate > Date.parse(today)) {
                    notificationDate = Date.parse(monthDay + ` ${now.getFullYear() - 1} ${hourMinute}`);
                } else {
                    notificationDate = Date.parse(`${monthDayYear} ${hourMinute}`);
                }

                if (notificationDate > time) {
                    time = notificationDate;
                    timeModified = true;
                    totalAssignments++;
                    Logger.log(notification);
                }
            }
        }

        if (totalAssignments > 0) {
            let n = {
                type: "basic",
                iconUrl: "imgs/icon@128.png",
                title: "New grade posted",
                message: `${totalAssignments} new assignment${totalAssignments === 1 ? " has a grade" : "s have grades"}`,
                eventTime: Date.now(),
                isClickable: true
            };

            sendNotification(n, "assignment", totalAssignments);
        }

        if (timeModified) {
            chrome.storage.sync.set({ lastTime: time }, () => { Logger.log("Set new time " + new Date(time)) });
        } else {
            Logger.log("No new notifications");
        }

    });
}

function getBrowser() {
    if (typeof chrome !== "undefined") {
        if (typeof browser !== "undefined") {
            return "Firefox";
        } else {
            return "Chrome";
        }
    } else {
        // Does not actually differentiate Chrome and Edge, since new Edge is Chromium
        return "Other";
    }
}

function createLogPrefix(color) {
    return `color:${color};border:1px solid #2A2A2A;border-radius:100%;font-size:14px;font-weight:bold;padding: 0 4px 0 4px;background-color:#2A2A2A`;
}

addDomainPermissionToggle();

// if (getBrowser() !== "Firefox") {
//     // See https://bugs.chromium.org/p/chromium/issues/detail?id=966223#c3
//     chrome.webRequest.onHeadersReceived.addListener(details => {
//         let exists = false;
//         details.responseHeaders.map(item => {
//             if (item.name.toLowerCase() === 'access-control-allow-origin') {
//                 item.value = '*';
//                 exists = true;
//             }
//         });
//         if (!exists) {
//             details.responseHeaders.push({ name: "access-control-allow-origin", value: "*" });
//             details.responseHeaders.push({ name: "access-control-allow-headers", value: "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization" });
//         }
//         return { responseHeaders: details.responseHeaders };
//     }, { urls: ['*://*.schoology.com/*'] }, ['blocking', 'responseHeaders', 'extraHeaders']);

// }