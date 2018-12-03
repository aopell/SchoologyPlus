function versionSpecificFirstLaunch(currentVersion, previousVersion) {
    switch (currentVersion) {
        case "4.3":
            if (previousVersion != "4.2") {
                versionSpecificFirstLaunch("4.2");
            }
            break;
        case "4.2":
            iziToast.show({
                theme: 'dark',
                iconUrl: chrome.runtime.getURL("/imgs/plus-icon.png"),
                title: "Take the Schoology Plus Fall 2018 Survey!",
                message: "Complete for a chance to win an Amazon gift card!",
                layout: 1,
                position: 'topRight',
                timeout: 0,
                progressBarColor: 'yellow',
                buttons: [
                    ['<button>Take the Survey!</button>', function (instance, toast) {
                        instance.hide({
                            transitionOut: 'fadeOutRight',
                            onClosing: function (instance, toast, closedBy) {
                                window.open("https://goo.gl/forms/EVi8cTaakVhLekiN2", "_blank");
                            }
                        }, toast, 'takeSurveyButton');
                    }]
                ]
            });

            chrome.storage.sync.get(["unreadBroadcasts", "broadcasts", "themes"], (storage) => {
                let broadcasts = storage.unreadBroadcasts || [];
                broadcasts.push({
                    id: Number.parseInt(currentVersion.replace('.', '')),
                    title: '',
                    message: '<span style="font-size: 16px; font-weight: bold">Take the Schoology Plus Fall 2018 Survey!</span><br/><br/><span style="font-size: 14px">Let us know your thoughts about Schoology Plus and complete the survey for a chance to win <strong style="background-color: yellow">one of two $5 Amazon gift cards!</strong><br/><br/><strong style="background-color: yellow"><a href="https://goo.gl/forms/EVi8cTaakVhLekiN2" target="_blank">Click Here to Take The Survey!</a></strong></span><br/><br/>',
                    shortMessage: "Complete for a chance to win an Amazon gift card!",
                    timestamp: Date.now()
                });

                let oldFormatThemesExist = false;
                for (let t of storage.themes || []) {
                    if (t.icons && !(t.icons instanceof Array)) {
                        oldFormatThemesExist = true;
                        let newIconsArray = [];
                        for (let k in t.icons) {
                            newIconsArray.push([k, t.icons[k]]);
                        }
                        t.icons = newIconsArray;
                    }
                }
                if (oldFormatThemesExist) {
                    alert("Warning! One or more of your themes were created using an old and broken format for custom icons. If custom icons have not been working for you, please proceed to the theme editor to fix the issue.");
                }

                chrome.storage.sync.remove(["lastBroadcastId", "hideUpdateIndicator"]);
                chrome.storage.sync.set({
                    unreadBroadcasts: broadcasts,
                    broadcasts: storage.broadcasts === "feed" ? "enabled" : storage.broadcasts,
                    themes: storage.themes
                });
            });
            break;
        default:
            break;
    }
}