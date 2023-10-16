(async function () {
    // Wait for loader.js to finish running
    while (!window.splusLoaded) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    await loadDependencies("version-specific", ["preload"]);
})();

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
            onClosing: function (instance, toast, closedBy) {
                trackEvent("button_click", {
                    id: id || text,
                    context: "Toast",
                    legacyTarget: id || text,
                    legacyAction: "click",
                    legacyLabel: "Toast Button"
                });
                onClick(instance, toast, closedBy);
            }
        }, toast, id);
    }];
}

/**
 * @typedef {{id:number,title:string,message:string,timestamp?:Date,expires?:timestamp}} Broadcast
 * @param {Broadcast[]} broadcasts Broadcasts to save
 * @param {()=>void} callback Function called after broadcasts are saved
 */
function saveBroadcasts(broadcasts, callback = undefined) {
    chrome.storage.sync.get(["unreadBroadcasts"], values => {
        let b = values.unreadBroadcasts || [];
        let ids = b.map(x => x.id);
        for (let br of broadcasts) {
            if (!ids.includes(br.id)) {
                b.push(br);
            }
        }
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
function createBroadcast(id, title, message, timestamp = Date.now(), expires = undefined) {
    return { id: String(id), title, message, timestamp: +timestamp, expires: expires !== undefined ? +expires : undefined };
}

/**
 * Deletes broadcasts with the given IDs if they exist
 * @param  {...number} ids Broadcasts to delete
 */
function deleteBroadcasts(...ids) {
    for (let id of ids) {
        let unreadBroadcasts = Setting.getValue("unreadBroadcasts");
        if (!unreadBroadcasts) continue;
        unreadBroadcasts.splice(unreadBroadcasts.findIndex(x => x.id == id), 1);
        Setting.setValue("unreadBroadcasts", unreadBroadcasts);

        let broadcastElement = document.getElementById(`broadcast${id}`);
        if (broadcastElement) {
            broadcastElement.outerHTML = "";
        }
    }
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
                "Schoology Plus Discord Server",
                "Schoology Plus has a Discord server where you can offer feature suggestions, report bugs, get support, or just talk with other Schoology Plus users. <a href=\"https://discord.schoologypl.us\" id=\"announcement-discord-link\" class=\"splus-track-clicks\">Click here</a> to join!",
                new Date(2019, 1 /* February - don't you just love JavaScript */, 14)
            )
        ]);
    },
    "6.2": function (currentVersion, previousVersion) {
        if (getBrowser() !== "Firefox") {
            var modalExistsInterval = setInterval(function () {
                if (document.readyState === "complete" && openModal && document.getElementById("analytics-modal") && !document.querySelector(".splus-modal-open")) {
                    clearInterval(modalExistsInterval);
                    openModal("analytics-modal");
                }
            }, 50);
        }
    },
    "6.6.4": function (currentVersion, previousVersion) {
        if (previousVersion && currentVersion === "6.6.4") {
            saveBroadcasts([
                createBroadcast(
                    660,
                    "Checkmarks for submitted assignments!",
                    `
                    <div>
                        <strong style="background: rgba(0,255,0,0.5) !important;">Schoology Plus now shows checkmarks for submitted assignments in the Upcoming box!</strong>

                        <p>By default, green check marks <span style="color: green !important;">✔</span> are shown on all
                        assignments you've submitted. There are also options for putting a <span style="text-decoration: line-through;">strikethrough</span>
                        through the assignment title or hiding the assignments completely. Of course you can also turn this feature off in settings.</p>
                        
                        <p><a href="#splus-settings#setting-input-indicateSubmission" style="font-weight: bold; font-size: 14px;">Click here to change this setting</a></p>
                    </div>
                    <img style="padding-top: 10px;" src="https://i.imgur.com/mrE2Iec.png"/>
                    `,
                    new Date(2020, 9 /* October */, 19)
                )
            ]);
        }
    },
    "7.1": function (currentVersion, previousVersion) {
        var modalExistsInterval = setInterval(function () {
            if (document.readyState === "complete" && openModal && document.getElementById("choose-theme-modal") && !document.querySelector(".splus-modal-open")) {
                clearInterval(modalExistsInterval);
                openModal("choose-theme-modal");
            }
        }, 50);
    },
    "7.5": function (currentVersion, previousVersion) {
        chrome.storage.sync.get(["themes"], values => {
            if (values.themes) {
                let count = 0;

                for (let theme of values.themes) {
                    count++;
                    if (theme.color.modern) {
                        theme.color.modern.calendar.push(
                            "#00427c",
                            "#603073",
                            "#8b1941",
                            "#970c0c",
                            "#9c3b07",
                            "#685203",
                            "#2a5f16",
                            "#09584f",
                            "#005a75",
                            "#4d5557"
                        );
                    }
                }

                chrome.storage.sync.set({
                    themes: values.themes
                });

                Logger.log(`Migrated ${count} themes to include new calendar colors`);
            } else {
                Logger.log(`No themes to migrate`);
            }
        });
    },
    "7.7": function (currentVersion, previousVersion) {
        var accessToAccountInterval = setInterval(function () {
            if (document.readyState === "complete" && openModal && !document.querySelector(".splus-modal-open")) {
                clearInterval(accessToAccountInterval);
                if (!Setting.getValue("apistatus")) {
                    location.pathname = "/api";
                }
            }
        }, 50);
    },
    "7.8.6": function (currentVersion, previousVersion) {
        saveBroadcasts([
            createBroadcast(
                670,
                "Schoology Plus Fall 2023 Survey",
                `
                <div>
                    <strong style="background: rgba(0,128,255,0.5) !important; color: white !important;">Take the Schoology Plus Fall 2023 Survey!</strong>
                    <p>Occasionally we run this survey to understand how best to improve Schoology Plus for our users.</p>
                    <p>Spend 10 minutes completing this year's survey and you'll be entered into a giveaway for one of
                        <span style="background: rgb(255, 255, 0) !important; color: black !important; font-weight: bold;">20 Amazon gift cards totaling $150</span>
                        : ten $10 cards and ten $5 cards, so <strong>your chance of winning is higher than ever before!</strong>
                    </p>
                    <p>Thank you for helping improve Schoology Plus! Your feedback is incredibly valuable to us and will likely impact to what extent Schoology Plus is improved in the future.</p>
                    <p><a href="https://survey.schoologypl.us?source=ExtensionBroadcast&domain=${location.hostname}"><strong style="background: rgba(255,60,0,0.5) !important; color: white !important; font-size: 16px;">Click here to visit survey.schoologypl.us and take the survey now!</strong></a></p>
                </div>
                `,
                new Date(2023, 9 /* October */, 15),
                new Date(2023, 11 /* December */, 1) // expiration date
            )
        ]);

        if (Date.now() < new Date(2023, 11 /* December */, 1)) {
            showToast("Take the Schoology Plus Survey!", "Enter to win one of 20 Amazon gift cards!", "yellow", {
                buttons: [
                    createToastButton("Take Survey!", "toast-take-splus-survey-fall2023", (i, t, b) => window.open(`https://survey.schoologypl.us?source=ExtensionToast&domain=${location.hostname}`, "_blank"))
                ]
            });
        }
    }
};

async function versionSpecificFirstLaunch(currentVersion, previousVersion) {
    Logger.log("[Updater] First launch after update, updating to ", currentVersion, " from ", previousVersion);

    if (!previousVersion) {
        trackEvent("perform_action", {
            id: "install_extension",
            value: currentVersion,
            context: "Versions",
            legacyTarget: "Install",
            legacyAction: currentVersion,
            legacyLabel: "Versions"
        });
    } else {
        trackEvent("perform_action", {
            id: "update_extension",
            value: currentVersion,
            previousValue: previousVersion,
            context: "Versions",
            legacyTarget: "Update",
            legacyAction: `${previousVersion} to ${currentVersion}`,
            legacyLabel: "Versions"
        });
    }

    // TODO add special handling if any migrations return a Promise such that we run in order
    for (let migrateTo in migrationsTo) {
        if (!previousVersion) {
            migrationsTo[migrateTo](currentVersion, previousVersion);
        } else if (compareVersions(migrateTo, currentVersion) <= 0 && compareVersions(migrateTo, previousVersion) > 0) {
            migrationsTo[migrateTo](currentVersion, previousVersion);
        }
    }
}