import "webext-dynamic-content-scripts";

import { trackEvent } from "./utils/analytics";
import { getBrowser } from "./utils/dom";
import { Logger } from "./utils/logger";
import { loadAssignmentNotifications } from "./utils/notifications";

var assignmentNotificationUrl = "https://app.schoology.com/home/notifications?filter=all";
var defaultDomain = "app.schoology.com";
const OFFSCREEN_DOCUMENT_PATH = "/offscreen.html";

async function load() {
    chrome.runtime.onInstalled.addListener(onInstalled);
    chrome.alarms.onAlarm.addListener(onAlarm);

    let s = await chrome.storage.sync.get({ defaultDomain: "app.schoology.com" });
    defaultDomain = s.defaultDomain;
    assignmentNotificationUrl = `https://${defaultDomain}/home/notifications?filter=all`;

    // TODO: Domain permissions toggle needs to be added
    // addDomainPermissionToggle();

    //Run once on load
    onAlarm({ name: "notification", scheduledTime: Date.now() });

    chrome.alarms.get("notification", function (alarm) {
        if (alarm) {
            Logger.log("Alarm is already registered");
        } else {
            Logger.log("Notifications alarm is not registered; registering...");
            chrome.alarms.create("notification", {
                periodInMinutes: 5,
            });
        }
    });

    chrome.notifications.onClicked.addListener(onNotificationClicked);
    chrome.action.setBadgeBackgroundColor({ color: [217, 0, 0, 255] });

    chrome.action.onClicked.addListener(onActionClicked);
    chrome.runtime.onMessage.addListener(onMessage);
}

async function onActionClicked() {
    Logger.log("Browser action clicked");
    let badgeText = await chrome.action.getBadgeText({});
    let n = Number.parseInt(badgeText);

    trackEvent("button_click", {
        id: "main-browser-action-button",
        context: "Browser Action",
        value: String(n || 0),
        legacyTarget: "Browser Action",
        legacyAction: n ? `browser action clicked: ${n}` : "browser action clicked: 0",
        legacyLabel: "Notifications",
    });

    Logger.log(`Browser action text: "${badgeText}"`);
    if (n) chrome.tabs.create({ url: `https://${defaultDomain}/home/notifications` });
    else chrome.tabs.create({ url: `https://${defaultDomain}` });
    chrome.action.setBadgeText({ text: "" });
}

function onNotificationClicked(id: string) {
    Logger.log("Notification clicked");
    trackEvent("perform_action", {
        id: "click",
        context: "Notifications",
        value: id,
        legacyTarget: id,
        legacyAction: "notification click",
        legacyLabel: "Notifications",
    });
    chrome.notifications.clear(id);
    switch (id) {
        case "assignment":
            chrome.tabs.create({ url: `https://${defaultDomain}/home/notifications` });
            chrome.action.setBadgeText({ text: "" });
            break;
        default:
            chrome.tabs.create({ url: `https://${defaultDomain}` });
            break;
    }
}

async function onAlarm(alarm: chrome.alarms.Alarm) {
    let storageContent = await chrome.storage.sync.get(null);

    if (alarm && alarm.name === "notification") {
        try {
            Logger.log(`[${new Date()}] Checking for new notifications`);
            if (storageContent.notifications != "disabled") {
                checkForNotifications();
            }
        } catch (error) {
            Logger.error("Error caught:");
            Logger.error(error);
        }
    }
}

function onInstalled(details: chrome.runtime.InstalledDetails) {
    trackEvent("perform_action", {
        id: "runtime_oninstalled",
        value: details.reason,
        context: "Versions",
        legacyTarget: "Runtime onInstalled",
        legacyAction: details.reason,
        legacyLabel: "Versions",
    });

    chrome.contextMenus.create({
        title: "Theme Editor",
        contexts: ["browser_action"],
        onclick: () => chrome.tabs.create({ url: chrome.runtime.getURL("/theme-editor.html") }),
    });

    chrome.contextMenus.create({
        title: "Discord Support Server",
        contexts: ["browser_action"],
        onclick: () => chrome.tabs.create({ url: "https://discord.schoologypl.us" }),
    });

    chrome.contextMenus.create({
        title: "Schoology Plus Website",
        contexts: ["browser_action"],
        onclick: () =>
            chrome.tabs.create({ url: "https://schoologypl.us?utm_source=ext-context-menu" }),
    });
}

function onMessage(
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
) {
    if (request.type == "fetch" && request.url !== undefined) {
        Logger.debug("Received fetch request for " + request.url);

        (async function () {
            let finalResponse: Record<string, any> = {};
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
        })()
            .then(x => sendResponse(JSON.stringify(x)))
            .catch(err => sendResponse(JSON.stringify({ success: false, error: err })));

        return true;
    } else if (request.type == "updateDefaultDomain" && request.domain !== undefined) {
        defaultDomain = request.domain;
        assignmentNotificationUrl = `https://${defaultDomain}/home/notifications?filter=all`;
    } else if (request.type == "setBadgeText" && request.text !== undefined) {
        chrome.browserAction.setBadgeText({ text: request.text });
    }
}

async function checkForNotifications() {
    if (getBrowser() === "Firefox") {
        // Firefox doesn't support service workers so it doesn't need offscreen documents
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background#background_pages
        loadAssignmentNotifications(assignmentNotificationUrl);
        return;
    }

    // Do below only in Chrome

    // Create an offscreen document if one doesn't exist yet
    if (!(await hasOffscreenDocument())) {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: [chrome.offscreen.Reason.DOM_PARSER],
            justification: "Parse Schoology notifications, which are returned from the API as HTML",
        });
    }
    // Now that we have an offscreen document, we can dispatch the
    // message.
    chrome.runtime.sendMessage({
        type: "notifications",
        target: "offscreen",
        data: { url: assignmentNotificationUrl },
    });
}

declare var clients: { matchAll: () => { url: string }[] };

async function hasOffscreenDocument() {
    // Check all windows controlled by the service worker if one of them is the offscreen document
    const matchedClients = clients.matchAll();
    for (const client of matchedClients) {
        if (client.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
            return true;
        }
    }
    return false;
}

load();
