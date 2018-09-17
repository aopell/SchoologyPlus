const broadcastNotificationUrl = "https://aopell.me/SchoologyPlus/notifications.json";
const assignmentNotificationUrl = "https://lms.lausd.net/home/notifications?filter=all";

/** @typedef {{id:number,title:string,message:string,shortMessage:string,timestamp?:Date,icon?:string}} Broadcast */

console.log("Loaded event page");
console.log("Adding onInstalled listener");
chrome.runtime.onInstalled.addListener(function () {
    console.log("Registered alarm");
    chrome.alarms.create("notification", {
        periodInMinutes: 5
    });
});
console.log("Adding alarm listener");
chrome.alarms.onAlarm.addListener(onAlarm);
console.log("Adding notification listener");
chrome.notifications.onClicked.addListener(function (id) {
    console.log("Notification clicked");
    chrome.notifications.clear(id, null);
    if (id.startsWith("broadcast")) {
        chrome.tabs.create({ url: "https://lms.lausd.net" }, null);
        return;
    }
    switch (id) {
        case "assignment":
            chrome.tabs.create({ url: "https://lms.lausd.net/home/notifications" }, null);
            chrome.browserAction.setBadgeText({ text: "" });
            break;
    }
});
chrome.browserAction.setBadgeBackgroundColor({ color: [217, 0, 0, 255] });
console.log("Adding browser action listener");
chrome.browserAction.onClicked.addListener(function () {
    console.log("Browser action clicked");
    chrome.browserAction.getBadgeText({}, x => {
        console.log(x);
        let n = Number.parseInt(x);
        if (n) chrome.tabs.create({ url: "https://lms.lausd.net/home/notifications" }, null);
        else chrome.tabs.create({ url: "https://lms.lausd.net" }, null);
        chrome.browserAction.setBadgeText({ text: "" });
    });
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
        if(getBrowser() == "Firefox") {
            delete notification.requireInteraction;
        }
        console.warn("New notification!");
        console.dir(notification);

        if (count > 0 && (!storageContent.notifications || storageContent.notifications == "enabled" || storageContent.notifications == "badge")) {
            chrome.browserAction.getBadgeText({}, x => {
                let num = Number.parseInt(x);
                chrome.browserAction.setBadgeText({ text: (num ? num + count : count).toString() });
            });
        } else {
            console.log("Number badge is disabled");
        }
        if (!storageContent.notifications || storageContent.notifications == "enabled" || storageContent.notifications == "popup") {
            chrome.notifications.create(name, notification, null);
        } else {
            console.log("Popup notifications are disabled");
        }
    });
}

/**
 * Creates a Chrome NotificationOptions object from a Broadcast object
 * @param {Broadcast} broadcast The broadcast to turn into a Chrome notification
 * @returns {NotificationOptions}
 */
function notificationFromBroadcast(broadcast) {
    return {
        type: "basic",
        iconUrl: broadcast.icon || "imgs/icon@128.png",
        title: broadcast.title,
        message: broadcast.shortMessage,
        eventTime: broadcast.timestamp ? new Date(broadcast.timestamp).getTime() : Date.now(),
        isClickable: true,
        requireInteraction: true
    };
}

function onAlarm(alarm) {
    chrome.storage.sync.get(null, function (storageContent) {
        if (alarm && alarm.name === "notification") {
            try {
                console.log(`[${new Date()}] Checking for new notifications`);
                if (storageContent.broadcasts != "disabled") {
                    loadBroadcasts(storageContent);
                }
                if (storageContent.notifications != "disabled") {
                    loadAssignmentNotifications(storageContent);
                }
            } catch (error) {
                console.error("Error caught:");
                console.error(error);
            }
        }
    });
}

function loadBroadcasts(storageContent) {
    fetch(broadcastNotificationUrl).then(function (response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error("Error loading broadcast notifications: " + response);
    }).then(function (response) {
        let lastId = storageContent.lastBroadcastId || (storageContent.newVersion ? 1 : 0);
        /** @type {Broadcast[]} */
        let broadcasts = response;
        /** @type {Broadcast[]} */
        let unreadBroadcasts = storageContent.unreadBroadcasts || [];
        let newBroadcasts = broadcasts.filter(x => x.id > lastId);

        let maxId = lastId;
        unreadBroadcasts = unreadBroadcasts.concat(newBroadcasts);
        if (!storageContent.broadcasts || storageContent.broadcasts == "enabled") {
            for (let broadcast of newBroadcasts) {
                sendNotification(notificationFromBroadcast(broadcast), `broadcast${broadcast.id}`, 0);
                maxId = Math.max(maxId, broadcast.id);
            }
        }

        chrome.storage.sync.set({ lastBroadcastId: maxId, unreadBroadcasts: unreadBroadcasts }, null);
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
        console.log("Last new grade: " + new Date(storageContent.lastTime).toString());
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
                    console.dir(notification);
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
            chrome.storage.sync.set({ lastTime: time }, () => { console.log("Set new time " + new Date(time)) });
        } else {
            console.log("No new notifications");
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