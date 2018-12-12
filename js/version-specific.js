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
function createBroadcasts(broadcasts, callback = undefined) {
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
    return { id, title, message, timestamp };
}

/*
* Migrations to a given version from any versions before it.
* Should be ordered in increasing version order.
*/
let migrationsTo = {
    "4.2": function (currentVersion, previousVersion) {
        showToast("Take the Schoology Plus Fall 2018 Survey!", "Complete for a chance to win an Amazon gift card!", "yellow", {
            buttons: [
                createToastButton("Take the Survey!", "take-survey-button", (i, t, c) => window.open("https://goo.gl/forms/EVi8cTaakVhLekiN2", "_blank"))
            ]
        });

        chrome.storage.sync.get(["unreadBroadcasts", "broadcasts", "themes"], (values) => {
            let broadcasts = values.unreadBroadcasts || [];
            broadcasts.push(createBroadcast(
                420,
                '',
                '<span style="font-size: 16px; font-weight: bold">Take the Schoology Plus Fall 2018 Survey!</span><br/><br/><span style="font-size: 14px">Let us know your thoughts about Schoology Plus and complete the survey for a chance to win <strong style="background-color: yellow">one of two $5 Amazon gift cards!</strong><br/><br/><strong style="background-color: yellow"><a href="https://goo.gl/forms/EVi8cTaakVhLekiN2" target="_blank">Click Here to Take The Survey!</a></strong></span><br/><br/>',
            ));

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
            chrome.storage.sync.set({
                unreadBroadcasts: broadcasts,
                broadcasts: values.broadcasts === "feed" ? "enabled" : values.broadcasts,
                themes: values.themes
            });
        });
    },
    "4.4": function (currentVersion, previousVersion) {
        showToast(
            "Important Message!",
            "Schoology Plus will temporarily stop working beginning December 15",
            "red",
            {
                layout: 2,
                buttons: [
                    createToastButton(
                        "Click Here for More Info",
                        "more-info-notice-button",
                        (i, t, c) => window.open("https://aopell.me/SchoologyPlus/new-interface-notice", "_blank")
                    )
                ]
            }
        );
        createBroadcasts([
            createBroadcast(
                440,
                "Last Chance!",
                'The Schoology Plus Fall 2018 survey <strong>will close on December 20</strong>. This is the last chance for you to complete the survey for your chance to win <strong>one of two $5 Amazon gift cards!</strong> Winners will be announced after January 1.<br><br><a style="font-size: 14px; font-weight: bold" href="https://goo.gl/forms/EVi8cTaakVhLekiN2" target="_blank">Click Here to Take The Survey!</a>'
            ),
            createBroadcast(
                432,
                '',
                '<div style="border: 3px solid red; background-color: black; color: white;"><span style="font-size: 16px; font-weight: bold">Important Message!</span><br/><br/><span style="font-size: 14px">LAUSD is updating the Schoology interface on December 15, which will cause Schoology Plus to function incorrectly until the next version.</span><br/><br/><a href="https://aopell.me/SchoologyPlus/new-interface-notice" style="font-size: 16px; color: white; text-decoration: underline;">Click Here For More Info</a></div>'
            )
        ]);
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