console.log("okthen");

window.onload = function() {
    console.log("init called");
    document.getElementById("request-cookies").addEventListener("click", event => {
        chrome.permissions.request({ permissions: ["cookies"] }, function (granted) {
            if (granted) {
                chrome.storage.sync.set({ sessionCookiePersist: "enabled" }, () => console.log("DONE ENABLING SESSIONS"));
            }
        });
    });
}