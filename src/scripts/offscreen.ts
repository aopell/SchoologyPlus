import { loadAssignmentNotifications } from "./utils/notifications";

// Registering this listener when the script is first executed ensures that the
// offscreen document will be able to receive messages when the promise returned
// by `offscreen.createDocument()` resolves.
chrome.runtime.onMessage.addListener(handleMessages);

// This function performs basic filtering and error checking on messages before
// dispatching the message to a more specific message handler.
async function handleMessages(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
) {
    // Return early if this message isn't meant for the offscreen document.
    if (message.target !== "offscreen") {
        return false;
    }

    // Dispatch the message to an appropriate handler.
    switch (message.type) {
        case "notifications":
            loadAssignmentNotifications(message.data.url);
            break;
        default:
            console.warn(`Unexpected message type received: '${message.type}'.`);
            return false;
    }
}
