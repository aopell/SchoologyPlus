import "../styles/all.css";

// An example of async send message
chrome.runtime.sendMessage({ type: "hello" }).then(response => {
    console.log("+++response", response);
});

chrome.runtime.sendMessage({ type: "login" }).then(response => {
    console.log("+++response", response);
});
