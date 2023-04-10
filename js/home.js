(async function () {
    // Wait for loader.js to finish running
    while (!window.splusLoaded) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    await loadDependencies("home", ["all"]);
})();

/** @typedef {{id:number,title:string,message:string,timestamp?:Date,icon?:string}} Broadcast */

let homeFeedContainer = document.getElementById("home-feed-container");
let feed = homeFeedContainer && homeFeedContainer.querySelector(".feed .item-list .s-edge-feed");

/**
 * Creates a post from a broadcast
 * @param {Broadcast} broadcast 
 */
function postFromBroadcast(broadcast) {
    let element = createElement("li", ["splus-broadcast-post"], { id: `broadcast${broadcast.id}`, timestamp: (broadcast.timestamp ? new Date(broadcast.timestamp).getTime() : Date.now()) / 1000 }, [
        createElement("div", ["s-edge-type-update-post", "sUpdate-processed"], {}, [
            createElement("div", ["edge-item"], {}, [
                createElement("div", ["edge-left"], {}, [
                    createElement("div", ["picture"], {}, [
                        createElement("a", ["sExtlink-processed"], { href: "", title: "Schoology Plus Broadcast" }, [
                            createElement("div", ["profile-picture-wrapper"], {}, [
                                createElement("div", ["profile-picture"], {}, [
                                    createElement("img", ["imagecache", "imagecache-profile_sm"], { src: chrome.runtime.getURL("imgs/icon@128.png"), alt: "Schoology Plus Logo" })
                                ])
                            ])
                        ])
                    ])
                ]),
                createElement("div", ["edge-main-wrapper"], {}, [
                    createElement("span", ["edge-sentence"], {}, [
                        createElement("div", ["update-sentence-inner"], {}, [
                            createElement("a", ["sExtlink-processed"], { textContent: "SCHOOLOGY PLUS" }),
                            createElement("span", ["blue-arrow-right"], {}, [
                                createElement("span", ["visually-hidden"], { textContent: "posted to" })
                            ]),
                            createElement("a", ["sExtlink-processed"], { textContent: "Schoology Plus Announcements" }),
                            createElement("span", ["splus-broadcast-close"], {
                                textContent: "×", title: "Dismiss notification", onclick: () => trackEvent("button_click", {
                                    id: "close",
                                    context: "Broadcast",
                                    value: broadcast.id,
                                    legacyTarget: `broadcast${broadcast.id}`,
                                    legacyAction: "close",
                                    legacyLabel: "Broadcast"
                                })
                            }),
                            createElement("span", ["update-body", "s-rte"], {}, [
                                createElement("p", ["no-margins"], {}, [
                                    createElement("strong", ["splus-broadcast-title"], { innerHTML: broadcast.title })
                                ]),
                                createElement("p", ["small-top-margin"], { innerHTML: broadcast.message })
                            ])
                        ])
                    ]),
                    createElement("span", ["edge-main"], {}, [
                        createElement("div", ["post-body"])
                    ]),
                    createElement("div", ["edge-footer"], {}, [
                        createElement("div", ["created"], {}, [
                            createElement("span", ["small", "gray"], { textContent: `${formatDateAsString(new Date(broadcast.timestamp || undefined))} | This post is pinned to the top` })
                        ])
                    ])
                ])
            ])
        ])
    ]);

    let arrow = element.querySelector(".blue-arrow-right");
    arrow.insertAdjacentText("beforebegin", " ");
    arrow.insertAdjacentText("afterend", " ");

    let closeButton = element.querySelector(".splus-broadcast-close");
    closeButton.dataset.broadcastId = broadcast.id;
    closeButton.addEventListener("click", dismissNotification);

    return element;
}

function dismissNotification(event) {
    let id = event.target.dataset.broadcastId;

    let unreadBroadcasts = Setting.getValue("unreadBroadcasts");
    unreadBroadcasts.splice(unreadBroadcasts.findIndex(x => x.id == id), 1);
    Setting.setValue("unreadBroadcasts", unreadBroadcasts);

    let readBroadcasts = localStorage.getItem("splus-readBroadcasts");
    readBroadcasts = readBroadcasts === null ? [] : JSON.parse(readBroadcasts);
    readBroadcasts.push(id);
    localStorage.setItem("splus-readBroadcasts", JSON.stringify(readBroadcasts));

    document.getElementById(`broadcast${id}`).outerHTML = "";
}

function formatDateAsString(date) {
    return `${date.toLocaleString("en-US", { weekday: "short" })} ${date.toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric" })} at ${date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()}`;
}

if (homeFeedContainer && Setting.getValue("broadcasts") !== "disabled") {
    (async function () {
        let observer = new MutationObserver(async function (mutations) {
            if (mutations.length == 0) {
                return;
            }

            // we Should only be observing changes to style on homeFeedContainer
            // style is set on homeFeedContainer whenever Schoology decides to unhide it (static CSS sets display: none), i.e. when it's finished loading
            // once this happens, we can do our thing

            let unreadBroadcasts = Setting.getValue("unreadBroadcasts") || [];
            let onlineBroadcasts = [];

            try {
                onlineBroadcasts = await (await fetch("https://schoologypl.us/alert.json")).json();
    
                let readBroadcasts = localStorage.getItem("splus-readBroadcasts");
                readBroadcasts = readBroadcasts === null ? [] : JSON.parse(readBroadcasts);
    
                onlineBroadcasts = onlineBroadcasts.filter(b => !readBroadcasts.includes(b.id) && !unreadBroadcasts.map(u => u.id).includes(b.id));
            } catch (err) {
                // Ignore
            }

            let unexpiredBroadcasts = [];
            for (let broadcast of [...unreadBroadcasts, ...onlineBroadcasts]) {
                if (
                    (!broadcast.expires || broadcast.expires > Date.now())
                    && (!broadcast.version || compareVersions(chrome.runtime.getManifest().version, broadcast.version) >= 0)
                ) {
                    feed.insertAdjacentElement("afterbegin", postFromBroadcast(broadcast));
                    unexpiredBroadcasts.push(broadcast);
                }
            }

            // remove expired broadcasts
            Setting.setValue("unreadBroadcasts", unexpiredBroadcasts);

            // then disconnect
            observer.disconnect();
        });

        observer.observe(homeFeedContainer, {
            attributes: true,
            attributeFilter: ["style"]
        });
    })();
}

function reorderSidebar() {
    let sidebar = document.getElementById("right-column-inner");
    let sidebarOrder = Setting.getValue("sidebarSectionOrder");
    let excluded = sidebarOrder?.exclude || [];
    let included = (Array.from(sidebarOrder?.include || [])).reverse();

    for (let section of Array.from(SIDEBAR_SECTIONS).reverse()) {
        if (!included.includes(section.name) && !excluded.includes(section.name)) {
            if (section) {
                let element = document.querySelector(section.selector);
                if (element) {
                    sidebar.insertAdjacentElement("afterbegin", element);
                }
            }
        }
    }

    for (let sectionName of included) {
        let section = SIDEBAR_SECTIONS_MAP[sectionName];
        if (section) {
            let element = document.querySelector(section.selector);
            if (element) {
                sidebar.insertAdjacentElement("afterbegin", element);
            }
        }
    }

    for (let sectionName of excluded) {
        let section = SIDEBAR_SECTIONS_MAP[sectionName];
        if (section) {
            let element = document.querySelector(section.selector);
            if (element) {
                element.style.display = "none";
            }
        }
    }

    try {
        document.getElementById("todo")?.remove();
        let overdueHeading = document.querySelector(`${SIDEBAR_SECTIONS_MAP["Overdue"].selector} h4`);
        overdueHeading?.replaceWith(createElement("h3", [], {style: {textTransform: "capitalize"}, textContent: overdueHeading.textContent.toLowerCase()}));
        let upcomingHeading = document.querySelector(`${SIDEBAR_SECTIONS_MAP["Upcoming"].selector} h4`);
        upcomingHeading?.replaceWith(createElement("h3", [], {style: {textTransform: "capitalize"}, textContent: upcomingHeading.textContent.toLowerCase()}));
    }
    catch {}
}

(async function () {
    indicateSubmittedAssignments();
    await createQuickAccess();
    setTimeout(() => {
        reorderSidebar();
    }, 500);
})();

Logger.debug("Finished loading home.js");
