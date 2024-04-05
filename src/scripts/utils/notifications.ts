import DOMPurify from "dompurify";

import { trackEvent } from "./analytics";
import { getBrowser } from "./dom";
import { Logger } from "./logger";

export async function loadAssignmentNotifications(assignmentNotificationUrl: string) {
    let storageContent = await chrome.storage.sync.get(null);

    let response = await fetch(assignmentNotificationUrl, {
        credentials: "same-origin",
    });

    if (!response.ok) throw new Error("Error loading notifications: " + response);

    let responseJson = await response.json();

    Logger.log("Last new grade: " + new Date(storageContent.lastTime).toString());
    let time = storageContent.lastTime;
    let timeModified = false;
    if (!time) {
        time = Date.now();
        timeModified = true;
    }
    let div =
        document.querySelector("div") || document.body.appendChild(document.createElement("div"));
    div.innerHTML = DOMPurify.sanitize(responseJson.output);
    let notifications = div.querySelectorAll(".edge-sentence");
    let months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    let totalAssignments = 0;
    for (let notification of Array.from(notifications).reverse()) {
        if (notification.textContent!.includes("new grade")) {
            let assignments = notification.getElementsByTagName("a");
            let extraTextElement = notification.querySelector(".other-items-link");
            let timeText = notification.querySelector(".edge-time")!.textContent!;
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
        let n: chrome.notifications.NotificationOptions<true> = {
            type: "basic",
            iconUrl: "imgs/icon@128.png",
            title: "New grade posted",
            message: `${totalAssignments} new assignment${
                totalAssignments === 1 ? " has a grade" : "s have grades"
            }`,
            eventTime: Date.now(),
            isClickable: true,
        };

        sendNotification(n, "assignment", totalAssignments);
    }

    if (timeModified) {
        chrome.storage.sync.set({ lastTime: time }, () => {
            Logger.log("Set new time " + new Date(time));
        });
    } else {
        Logger.log("No new notifications");
    }
}

/**
 * Sends a desktop notification if settings permit
 * @param {NotificationOptions} notification A chrome notification object
 * @param {string} name The name of the notification
 * @param {number} [count=1] The number to add to the browser action badge
 */
function sendNotification(
    notification: chrome.notifications.NotificationOptions<true>,
    name: string,
    count: number
) {
    chrome.storage.sync.get(null, function (storageContent) {
        count = count || count == 0 ? count : 1;
        if (getBrowser() == "Firefox") {
            delete notification.requireInteraction;
        }
        Logger.log("New notification!", notification);

        if (
            count > 0 &&
            (!storageContent.notifications ||
                storageContent.notifications == "enabled" ||
                storageContent.notifications == "badge")
        ) {
            chrome.action.getBadgeText({}, x => {
                let num = Number.parseInt(x);
                chrome.action.setBadgeText({ text: (num ? num + count : count).toString() });
            });
        } else {
            Logger.log("Number badge is disabled");
        }
        if (
            !storageContent.notifications ||
            storageContent.notifications == "enabled" ||
            storageContent.notifications == "popup"
        ) {
            chrome.notifications.create(name, notification);
            trackEvent("perform_action", {
                id: "shown",
                context: "Notifications",
                value: name,
                legacyTarget: name,
                legacyAction: "shown",
                legacyLabel: "Notifications",
            });
        } else {
            Logger.log("Popup notifications are disabled");
        }
    });
}
