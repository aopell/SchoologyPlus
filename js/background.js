/**
 * Provides logging utilities
 */
class Logger {
    /**
     * Provides equivalent functionality to console.log
     * @param {string} message Message to log
     * @param  {...any} args Object arguments or strings to concatenate
     */
    static log(message, ...args) {
        console.log(`%c+%c ${message}`, "color: #81D4FA;border:1px solid #2A2A2A; border-radius: 100%; font-size: 14px;font-weight:bold;padding: 0 4px 0 4px;background-color:#2A2A2A", "color:black;", ...args)
    }

    /**
     * Provides equivalent functionality to console.error
     * @param {string} message Message to log (with "error" log level)
     * @param  {...any} args Object arguments or strings to concatenate
     */
    static error(message, ...args) {
        console.error(`%c+%c ${message}`, "color: #ff6961;border:1px solid #2A2A2A; border-radius: 100%; font-size: 14px;font-weight:bold;padding: 0 4px 0 4px;background-color:#2A2A2A", "color:black;", ...args)
    }

    /**
     * Provides equivalent functionality to console.info
     * @param {string} message Message to log (with "info" log level)
     * @param  {...any} args Object arguments or strings to concatenate
     */
    static info(message, ...args) {
        console.info(`%c+%c ${message}`, "color: #81D4FA;border:1px solid #2A2A2A; border-radius: 100%; font-size: 14px;font-weight:bold;padding: 0 4px 0 4px;background-color:#2A2A2A", "color:black;", ...args)
    }

    /**
     * Provides equivalent functionality to console.warn
     * @param {string} message Message to log (with "warn" log level)
     * @param  {...any} args Object arguments or strings to concatenate
     */
    static warn(message, ...args) {
        console.warn(`%c+%c ${message}`, "color: #fdfd96;border:1px solid #2A2A2A; border-radius: 100%; font-size: 14px;font-weight:bold;padding: 0 4px 0 4px;background-color:#2A2A2A", "color:black;", ...args)
    }

    /**
     * Provides equivalent functionality to console.trace
     * @param {string} message Message to log (with traceback)
     * @param  {...any} args Object arguments or strings to concatenate
     */
    static trace(message, ...args) {
        console.trace(`%c+%c ${message}`, "color: #81D4FA;border:1px solid #2A2A2A; border-radius: 100%; font-size: 14px;font-weight:bold;padding: 0 4px 0 4px;background-color:#2A2A2A", "color:black;", ...args)
    }
}

const assignmentNotificationUrl = "https://lms.lausd.net/home/notifications?filter=all";

Logger.log("Loaded event page");
Logger.log("Adding alarm listener");
chrome.alarms.onAlarm.addListener(onAlarm);
Logger.log("Adding notification listener");
chrome.notifications.onClicked.addListener(function (id) {
    Logger.log("Notification clicked");
    chrome.notifications.clear(id, null);
    switch (id) {
        case "assignment":
            chrome.tabs.create({ url: "https://lms.lausd.net/home/notifications" }, null);
            chrome.browserAction.setBadgeText({ text: "" });
            break;
        default:
            chrome.tabs.create({ url: "https://lms.lausd.net" });
            break;
    }
});
chrome.browserAction.setBadgeBackgroundColor({ color: [217, 0, 0, 255] });
Logger.log("Adding browser action listener");
chrome.browserAction.onClicked.addListener(function () {
    Logger.log("Browser action clicked");
    chrome.browserAction.getBadgeText({}, x => {
        Logger.log(`Browser action text: "${x}"`);
        let n = Number.parseInt(x);
        if (n) chrome.tabs.create({ url: "https://lms.lausd.net/home/notifications" }, null);
        else chrome.tabs.create({ url: "https://lms.lausd.net" }, null);
        chrome.browserAction.setBadgeText({ text: "" });
    });
});
Logger.log("Adding cookie change listener");
chrome.cookies.onChanged.addListener(function (changeInfo) {
    if (changeInfo.cookie.domain == ".lms.lausd.net" && changeInfo.cookie.name.startsWith("SESS")) {
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
            cookie.url = "https://lms.lausd.net/";
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
        Logger.warn("New notification!");
        Logger.log(notification);

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
        div.innerHTML = response.output;
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
        return "Edge";
    }
}