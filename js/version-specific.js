/** Compares two version strings a and b.
 * @param {string} a A string representing a numerical version.
 * @param {string} b A string representing a numerical version.
 * @returns {-1|1|0} A number less than 0 if a is less than b; a number greater than zero if a is greater than b; and a number equal to zero if a is equal to b.
 */
function compareVersions(a, b) {
    function sanitizeVersion(ver) {
        ver = ver.match(/\d+(\.\d+)*/)[0];
        return ver.split(".").map(x => +x);
    }
    a = sanitizeVersion(a);
    b = sanitizeVersion(b);

    let swapped = false;
    if (b.length < a.length) {
        let temp = a;
        a = b;
        b = temp;
        swapped = true;
    }

    while (a.length < b.length) {
        a.push(0);
    }

    if (swapped) {
        let temp = a;
        a = b;
        b = temp;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) {
            return -1;
        } else if (a[i] > b[i]) {
            return 1;
        }
    }
    return 0;
}

/**
 * Shows an iziToast with the given options
 * @param {string} title Toast title
 * @param {string} message Toast message
 * @param {string} color Progress bar color
 * @param {{theme:string,layout:number,buttons:[],timeout:number,position:string,options:{}}} options Options object (options object inside options is for additional options). Default values: `{ theme: "dark", layout: 1, timeout: 0, position: "topRight", iconUrl: chrome.runtime.getURL("/imgs/plus-icon.png") }`
 */
function showToast(title, message, color, { theme = "dark", layout = 1, buttons = [], timeout = 0, position = "topRight", options = {}, iconUrl = chrome.runtime.getURL("/imgs/plus-icon.png") } = { theme: "dark", layout: 1, timeout: 0, position: "topRight", iconUrl: chrome.runtime.getURL("/imgs/plus-icon.png") }) {
    let toastOptions = {
        theme,
        iconUrl,
        title,
        message,
        progressBarColor: color,
        layout,
        buttons,
        timeout,
        position
    };
    Object.assign(toastOptions, options);
    iziToast.show(toastOptions);
}

/**
 * Creates a button for an iziToast. Results of calls to this function should be passed to `showToast` as an array.
 * @typedef {[string,(any,any)=>void]} ToastButton
 * @param {string} text Text to display on the button
 * @param {string} id The element ID of the button
 * @param {(instance:any,toast:any,closedBy:any)=>void} onClick Function called when the button is clicked
 * @param {"fadeOut"|"fadeOutUp"|"fadeOutDown"|"fadeOutLeft"|"fadeOutRight"|"flipOutX"} [transition="fadeOutRight"] The notification's exit transition
 * @returns {ToastButton}
 */
function createToastButton(text, id, onClick, transition = "fadeOutRight") {
    return [`<button>${text}</button>`, function (instance, toast) {
        instance.hide({
            transitionOut: transition,
            onClosing: onClick
        }, toast, id);
    }];
}

/**
 * @typedef {{id:number,title:string,message:string,timestamp?:Date,icon?:string}} Broadcast
 * @param {Broadcast[]} broadcasts Broadcasts to save
 * @param {()=>void} callback Function called after broadcasts are saved
 */
function saveBroadcasts(broadcasts, callback = undefined) {
    chrome.storage.sync.get(["unreadBroadcasts"], values => {
        let b = values.unreadBroadcasts || [];
        b.push(...broadcasts);
        chrome.storage.sync.set({ unreadBroadcasts: b }, callback);
    });
}

/**
 * Creates a Broadcast. Result should be passed directly to `createBroadcasts`.
 * @param {number} id Broadcast ID number, should be unique
 * @param {string} title Short title for the broadcast
 * @param {string} message HTML content to be displayed in the home feed
 * @param {Date|number} timestamp Timestamp to show as the post time in the home feed
 * @returns {Broadcast}
 */
function createBroadcast(id, title, message, timestamp = Date.now()) {
    return { id, title, message, timestamp: +timestamp };
}

/**
 * Deletes broadcasts with the given IDs if they exist
 * @param  {...number} ids Broadcasts to delete
 */
function deleteBroadcasts(...ids) {
    chrome.storage.sync.get(["unreadBroadcasts"], v => {
        chrome.storage.sync.set({ unreadBroadcasts: v.unreadBroadcasts.filter(x => !ids.includes(x.id)) });
    });
}

/*
* Migrations to a given version from any versions before it.
* Should be ordered in increasing version order.
*/
let migrationsTo = {
    "4.2": function (currentVersion, previousVersion) {
        chrome.storage.sync.get(["broadcasts", "themes"], (values) => {

            let oldFormatThemesExist = false;
            for (let t of values.themes || []) {
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

            let newValues = {};

            if (values.broadcasts !== null && values.broadcasts !== undefined) {
                newValues.broadcasts = values.broadcasts === "feed" ? "enabled" : values.broadcasts;
            }

            if (values.themes !== null && values.themes !== undefined) {
                newValues.themes = values.themes;
            }

            chrome.storage.sync.set(newValues);
        });
    },
    "5.0": function (currentVersion, previousVersion) {
        saveBroadcasts([
            createBroadcast(
                500,
                "Schoology Plus Fall 2018 Survey Closed",
                "Thank you to all that participated in the survey. Winners of the Amazon gift card drawing will be contacted before New Year's. We look forward to using your ideas to make Schoology Plus even better. Thanks for your support!",
                new Date(2018, 11 /* don't you just love JavaScript */, 20)
            )
        ], () => {
            deleteBroadcasts(432, 440);
        });

        chrome.storage.sync.get(["hue", "theme", "themes"], values => {
            if (values.hue) {
                if (!values.theme || values.theme == "Custom Color" || values.theme == "Schoology Plus") {
                    Logger.log(`Converting theme ${values.theme} with custom hue ${values.hue} to new theme`)
                    let newTheme = {
                        name: "Custom Color",
                        hue: values.hue
                    }
                    values.themes.push(newTheme);
                    chrome.storage.sync.set({
                        theme: "Custom Color",
                        themes: values.themes
                    });
                    Logger.log("Theme 'Custom Color' created and set as selected theme");
                }
                Logger.log("Deleting deprecated 'hue' setting");
                chrome.storage.sync.remove(["hue"]);
            }
        });
    },
    "5.1": function (currentVersion, previousVersion) {
        saveBroadcasts([
            createBroadcast(
                510,
                "New Schoology Plus Discord Server",
                "Schoology Plus has a new Discord server where you can offer feature suggestions, report bugs, get support, or just talk with other Schoology Plus users. <a href=\"https://aopell.github.io/SchoologyPlus/discord.html\">Click here</a> to join!",
                new Date(2019, 1 /* February - don't you just love JavaScript */, 14)
            )
        ]);
    },
    "5.7": function(currentVersion, previousVersion) {
        saveBroadcasts([
            createBroadcast(
                570,
                '<span style="font-size: 20px;">Leave a review for Schoology Plus!</span>',
                '<div style="border: 1px solid black; background-color: lightgray; padding: 5px; font-size: 14px;">Do you love Schoology Plus?<br/>If so, we\'d really appreciate if you\'d leave us a review on the Chrome Web Store!<br/><br/><a href="https://chrome.google.com/webstore/detail/schoology-plus/fbfppoaockpecjpbdmldojdehdpepfef" target="_blank"><strong style="font-weight: 900">Click here to visit the page for Schoology Plus on the Chrome Web Store</strong></a></div>',
                new Date(2019, 11 /* December */, 11)
            )
        ]);

        showToast(
            "Love Schoology Plus? Leave a review!",
            "We'd really appreciate if you reviewed Schoology Plus on the Chrome Web Store",
            "rgb(0,255,0)",
            {
                buttons: [
                    createToastButton("Leave a Review", "leave-review-button", () => window.open("https://chrome.google.com/webstore/detail/schoology-plus/fbfppoaockpecjpbdmldojdehdpepfef", "_blank"))
                ]
            }
        );
    }
};

function versionSpecificFirstLaunch(currentVersion, previousVersion) {
    Logger.log("[Updater] Version specific first launch: ", currentVersion, " from ", previousVersion);

    // TODO add special handling if any migrations return a Promise such that we run in order
    for (let migrateTo in migrationsTo) {
        if (!previousVersion) {
            migrationsTo[migrateTo](currentVersion, previousVersion);
        } else if (compareVersions(migrateTo, currentVersion) <= 0 && compareVersions(migrateTo, previousVersion) > 0) {
            migrationsTo[migrateTo](currentVersion, previousVersion);
        }
    }
}