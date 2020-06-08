/** @typedef {{id:number,title:string,message:string,timestamp?:Date,icon?:string}} Broadcast */

let homeFeedContainer = document.getElementById("home-feed-container");
let feed = homeFeedContainer.querySelector(".feed .item-list .s-edge-feed");
let rightCol = document.getElementById("right-column-inner");

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
                            createElement("span", ["splus-broadcast-close"], { textContent: "×", title: "Dismiss notification", onclick: () => trackEvent(`broadcast${broadcast.id}`, "close", "Broadcast") }),
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
    document.getElementById(`broadcast${id}`).outerHTML = "";
}

function formatDateAsString(date) {
    return `${date.toLocaleString("en-US", { weekday: "short" })} ${date.toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric" })} at ${date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()}`;
}

async function createQuickAccess() {
    let linkWrap;

    let wrapper = createElement("div", ["quick-access-wrapper"], {}, [
        createElement("h3", ["h3-med"], {}, [
            createElement("img", ["splus-logo-inline"], { src: chrome.runtime.getURL("imgs/plus-icon.png"), title: "Provided by Schoology Plus" }),
            createElement("span", [], { textContent: "Quick Access" }),
            createElement("a", ["quick-right-link", "splus-track-clicks"], { id: "quick-access-splus-settings", textContent: "Settings", href: "#splus-settings#setting-input-quickAccessVisibility" })
        ]),
        createElement("div", ["date-header", "first"], {}, [
            createElement("h4", [], { textContent: "Pages" })
        ]),
        (linkWrap = createElement("div", ["quick-link-wrapper"]))
    ]);

    const PAGES = [
        { textContent: "Grade Report", href: "/grades/grades", id: "quick-access-grades" },
        { textContent: "Courses", href: "/courses", id: "quick-access-courses" },
        { textContent: "Mastery", href: "/mastery", id: "quick-access-mastery" },
        { textContent: "Groups", href: "/groups", id: "quick-access-groups" },
        { textContent: "Messages", href: "/messages", id: "quick-access-messages" },
    ];

    for (let page of PAGES) {
        let a = linkWrap.appendChild(createElement("a", ["quick-link", "splus-track-clicks"], page));
        a.dataset.splusTrackingLabel = "Quick Access";
    }

    wrapper.appendChild(
        createElement("div", ["date-header"], {}, [
            createElement("h4", [], {}, [
                createElement("span", [], { textContent: "Courses" }),
                createElement("a", ["quick-right-link", "splus-track-clicks"], { id: "quick-access-reorder", textContent: "Reorder", href: "/courses?reorder" })
            ])
        ])
    );

    let sectionsList = (await fetchApiJson(`users/${getUserId()}/sections`)).section;

    if (!sectionsList || sectionsList.length == 0) {
        wrapper.appendChild(createElement("p", ["quick-access-no-courses"], { textContent: "No courses found" }));
    } else {
        let courseOptionsButton;
        let iconImage;
        for (let section of sectionsList) {
            wrapper.appendChild(createElement("div", ["quick-access-course"], {}, [
                (iconImage = createElement("div", ["splus-course-icon"], { dataset: { courseTitle: `${section.course_title}: ${section.section_title}` } })),
                createElement("a", ["splus-track-clicks", "quick-course-link"], { textContent: `${section.course_title}: ${section.section_title}`, href: `/course/${section.id}`, dataset: { splusTrackingTarget: "quick-access-course-link", splusTrackingLabel: "Quick Access" } }),
                createElement("div", ["icons-container"], {}, [
                    createElement("a", ["icon", "icon-grades", "splus-track-clicks"], { href: `/course/${section.id}/student_grades`, title: "Grades", dataset: { splusTrackingTarget: "quick-access-grades-link", splusTrackingLabel: "Quick Access" } }),
                    createElement("a", ["icon", "icon-mastery", "splus-track-clicks"], { href: `/course/${section.id}/student_mastery`, title: "Mastery", dataset: { splusTrackingTarget: "quick-access-mastery-link", splusTrackingLabel: "Quick Access" } }),
                    (courseOptionsButton = createElement("a", ["icon", "icon-settings", "splus-track-clicks"], { href: "#", dataset: { splusTrackingTarget: "quick-access-settings-link", splusTrackingLabel: "Quick Access" } }))
                ])
            ]));

            iconImage.style.backgroundImage = `url(${chrome.runtime.getURL("imgs/fallback-course-icon.svg")})`;

            courseOptionsButton.addEventListener("click", () => openModal("course-settings-modal", {
                courseId: section.id,
                courseName: `${section.course_title}: ${section.section_title}`
            }));
        }
    }

    switch (Setting.getValue("quickAccessVisibility")) {
        case "belowOverdue":
            rightCol.querySelector(".overdue-submissions").insertAdjacentElement("afterend", wrapper);
            break;
        case "bottom":
            rightCol.append(wrapper);
            break;
        default:
            rightCol.prepend(wrapper);
            break;
    }
}

if (Setting.getValue("broadcasts") !== "disabled") {
    (function () {
        let observer = new MutationObserver(function (mutations) {
            if (mutations.length == 0) {
                return;
            }

            // we Should only be observing changes to style on homeFeedContainer
            // style is set on homeFeedContainer whenever Schoology decides to unhide it (static CSS sets display: none), i.e. when it's finished loading
            // once this happens, we can do our thing

            for (let broadcast of Setting.getValue("unreadBroadcasts") || []) {
                feed.insertAdjacentElement("afterbegin", postFromBroadcast(broadcast));
            }

            // then disconnect
            observer.disconnect();
        });

        observer.observe(homeFeedContainer, {
            attributes: true,
            attributeFilter: ["style"]
        });
    })();
}

createQuickAccess();