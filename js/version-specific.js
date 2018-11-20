function versionSpecificFirstLaunch(version) {
    switch (version) {
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

            chrome.storage.sync.get(["unreadBroadcasts", "broadcasts"], (storage) => {
                let broadcasts = storage.unreadBroadcasts || [];
                broadcasts.push({
                    id: Number.parseInt(version.replace('.', '')),
                    title: '',
                    message: '<span style="font-size: 16px; font-weight: bold">Take the Schoology Plus Fall 2018 Survey!</span><br/><br/><span style="font-size: 14px">Let us know your thoughts about Schoology Plus and complete the survey for a chance to win <strong style="background-color: yellow">one of two $5 Amazon gift cards!</strong><br/><br/><strong style="background-color: yellow"><a href="https://goo.gl/forms/EVi8cTaakVhLekiN2" target="_blank">Click Here to Take The Survey!</a></strong></span><br/><br/>',
                    shortMessage: "Complete for a chance to win an Amazon gift card!",
                    timestamp: Date.now()
                });
                chrome.storage.sync.remove(["lastBroadcastId", "hideUpdateIndicator"]);
                chrome.storage.sync.set({
                    unreadBroadcasts: broadcasts,
                    broadcasts: storage.broadcasts === "feed" ? "enabled" : storage.broadcasts
                });
            });
            break;
        default:
            break;
    }
}