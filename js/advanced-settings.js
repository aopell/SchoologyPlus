console.log("Advanced settings init");

// FIXME change this signature to take the container element or something
// for toggles we want to disable the current-setting button
function setSetting(realName, friendlyName, newState, reasonString = undefined) {
    chrome.storage.sync.set({ [realName]: newState }, () => {
        let alertString = friendlyName + " is now " + newState + ".";
        if (reasonString) {
            alertString = reasonString + " " + alertString;
        }
        alert(alertString);
    });
}

document.getElementById("stayloggedin-enable").addEventListener("click", event => {
    chrome.permissions.request({ permissions: ["cookies"] }, function (granted) {
        if (granted) {
            chrome.runtime.sendMessage({ type: "install_handler", handlerType: "cookies" }, function (response) {
                if (!response.isRegistered) {
                    console.error("Error registering cookie handler: " + response.error);
                }
                setSetting("sessionCookiePersist", "Stay Logged In", "enabled");
            });
        } else {
            setSetting("sessionCookiePersist", "Stay Logged In", "disabled", "Required permissions have been denied.");
        }
    });
});

document.getElementById("stayloggedin-disable").addEventListener("click", event => {
    chrome.runtime.sendMessage({ type: "revoke_permission", permissionSpecification: { permissions: ["cookies"] } }, function (response) {
        setSetting("sessionCookiePersist", "Stay Logged In", "disabled");
    });
});