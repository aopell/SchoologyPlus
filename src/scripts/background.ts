// Background Script
import browser from "webextension-polyfill";

browser.runtime.onMessage.addListener(message => {
    if (message.type === "hello") {
        return Promise.resolve("world");
    }

    // For async/await
    // read: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage
});
