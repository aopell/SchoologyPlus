import DOMPurify from "dompurify";

import { trackEvent } from "../utils/analytics";
import { fetchApiJson, getUserId } from "../utils/api";
import { Broadcast } from "../utils/broadcast";
import { EXTENSION_NAME, EXTENSION_WEBSITE } from "../utils/constants";
import { createButton, createElement, createSvgLogo, waitForElement } from "../utils/dom";
import { Logger } from "../utils/logger";
import Modal from "../utils/modal";
import { SIDEBAR_SECTIONS, SIDEBAR_SECTIONS_MAP, Setting } from "../utils/settings";
import { compareVersions } from "../utils/version";

export async function load() {
    loadBroadcasts();

    indicateSubmittedAssignments();
    getRecentlyCompletedDenominators();
    await createQuickAccess();

    setTimeout(() => {
        reorderSidebar();
    }, 500);
}

function loadBroadcasts() {
    let homeFeedContainer = document.getElementById("home-feed-container");
    let feed =
        homeFeedContainer &&
        homeFeedContainer.querySelector<HTMLElement>(".feed .item-list .s-edge-feed");

    if (homeFeedContainer && Setting.getValue("broadcasts") !== "disabled") {
        (async function () {
            await waitForElement("#home-feed-container #edge-filters");

            // we Should only be observing changes to style on homeFeedContainer
            // style is set on homeFeedContainer whenever Schoology decides to unhide it (static CSS sets display: none), i.e. when it's finished loading
            // once this happens, we can do our thing

            let unreadBroadcasts: Broadcast[] = Setting.getValue("unreadBroadcasts") || [];
            let onlineBroadcasts: Broadcast[] = [];

            try {
                onlineBroadcasts = await (await fetch(`${EXTENSION_WEBSITE}/alert.json`)).json();

                let readBroadcasts = localStorage.getItem("splus-readBroadcasts");
                let parsedReadBroadcasts: string[] =
                    readBroadcasts === null ? [] : JSON.parse(readBroadcasts);

                onlineBroadcasts = onlineBroadcasts.filter(
                    b =>
                        !parsedReadBroadcasts.includes(b.id) &&
                        !unreadBroadcasts.map(u => u.id).includes(b.id)
                );

                for (let onlineBroadcast of onlineBroadcasts) {
                    onlineBroadcast.title = DOMPurify.sanitize(onlineBroadcast.title);
                    onlineBroadcast.message = DOMPurify.sanitize(onlineBroadcast.message);
                }
            } catch (err) {
                // Ignore
            }

            let unexpiredBroadcasts: Broadcast[] = [];
            for (let broadcast of [...unreadBroadcasts, ...onlineBroadcasts]) {
                if (
                    (!broadcast.expires || broadcast.expires > Date.now()) &&
                    (!broadcast.version ||
                        compareVersions(chrome.runtime.getManifest().version, broadcast.version) >=
                            0)
                ) {
                    feed?.insertAdjacentElement("afterbegin", postFromBroadcast(broadcast));
                    unexpiredBroadcasts.push(broadcast);
                }
            }

            // remove expired broadcasts
            Setting.setValue("unreadBroadcasts", unexpiredBroadcasts);
        })();
    }
}

function postFromBroadcast(broadcast: Broadcast) {
    let element = createElement(
        "li",
        ["splus-broadcast-post"],
        {
            id: `broadcast${broadcast.id}`,
            // Migration note: previously this was a top-level attribute called timestamp??
            // Doesn't seem to be used anywhere?
            dataset: {
                timestamp: (
                    (broadcast.timestamp ? new Date(broadcast.timestamp).getTime() : Date.now()) /
                    1000
                ).toString(),
            },
        },
        [
            createElement("div", ["s-edge-type-update-post", "sUpdate-processed"], {}, [
                createElement("div", ["edge-item"], {}, [
                    createElement("div", ["edge-left"], {}, [
                        createElement("div", ["picture"], {}, [
                            createElement(
                                "a",
                                ["sExtlink-processed"],
                                { href: "", title: `${EXTENSION_NAME} Broadcast` },
                                [
                                    createElement("div", ["profile-picture-wrapper"], {}, [
                                        createElement("div", ["profile-picture"], {}, [
                                            createElement(
                                                "img",
                                                ["imagecache", "imagecache-profile_sm"],
                                                {
                                                    src: chrome.runtime.getURL("imgs/icon@128.png"),
                                                    alt: `${EXTENSION_NAME} Logo`,
                                                }
                                            ),
                                        ]),
                                    ]),
                                ]
                            ),
                        ]),
                    ]),
                    createElement("div", ["edge-main-wrapper"], {}, [
                        createElement("span", ["edge-sentence"], {}, [
                            createElement("div", ["update-sentence-inner"], {}, [
                                createElement("a", ["sExtlink-processed"], {
                                    textContent: EXTENSION_NAME.toUpperCase(),
                                }),
                                createElement("span", ["blue-arrow-right"], {}, [
                                    createElement("span", ["visually-hidden"], {
                                        textContent: "posted to",
                                    }),
                                ]),
                                createElement("a", ["sExtlink-processed"], {
                                    textContent: `${EXTENSION_NAME} Announcements`,
                                }),
                                createElement("span", ["splus-broadcast-close"], {
                                    textContent: "×",
                                    title: "Dismiss notification",
                                    onclick: () =>
                                        trackEvent("button_click", {
                                            id: "close",
                                            context: "Broadcast",
                                            value: broadcast.id,
                                            legacyTarget: `broadcast${broadcast.id}`,
                                            legacyAction: "close",
                                            legacyLabel: "Broadcast",
                                        }),
                                }),
                                createElement("span", ["update-body", "s-rte"], {}, [
                                    createElement("p", ["no-margins"], {}, [
                                        createElement("strong", ["splus-broadcast-title"], {
                                            innerHTML: broadcast.title,
                                        }),
                                    ]),
                                    createElement("p", ["small-top-margin"], {
                                        innerHTML: broadcast.message,
                                    }),
                                ]),
                            ]),
                        ]),
                        createElement("span", ["edge-main"], {}, [
                            createElement("div", ["post-body"]),
                        ]),
                        createElement("div", ["edge-footer"], {}, [
                            createElement("div", ["created"], {}, [
                                createElement("span", ["small", "gray"], {
                                    textContent: `${formatDateAsString(
                                        new Date(broadcast.timestamp ?? Date.now())
                                    )} | This post is pinned to the top`,
                                }),
                            ]),
                        ]),
                    ]),
                ]),
            ]),
        ]
    );

    let arrow = element.querySelector(".blue-arrow-right");
    arrow?.insertAdjacentText("beforebegin", " ");
    arrow?.insertAdjacentText("afterend", " ");

    let closeButton = element.querySelector<HTMLElement>(".splus-broadcast-close");
    if (closeButton) {
        closeButton.dataset.broadcastId = broadcast.id;
        closeButton.addEventListener("click", dismissNotification);
    }

    return element;
}

function dismissNotification(event: Event) {
    let id = (event.target as HTMLElement)?.dataset?.broadcastId;

    if (!id) return;

    let unreadBroadcasts = Setting.getValue<Broadcast[]>("unreadBroadcasts", []);
    unreadBroadcasts.splice(
        unreadBroadcasts.findIndex(x => x.id == id),
        1
    );
    Setting.setValue("unreadBroadcasts", unreadBroadcasts);

    let readBroadcasts = localStorage.getItem("splus-readBroadcasts");
    let parsedReadBroadcasts: string[] = readBroadcasts === null ? [] : JSON.parse(readBroadcasts);
    parsedReadBroadcasts.push(id);
    localStorage.setItem("splus-readBroadcasts", JSON.stringify(parsedReadBroadcasts));

    document.getElementById(`broadcast${id}`)!.outerHTML = "";
}

function formatDateAsString(date: Date) {
    return `${date.toLocaleString("en-US", { weekday: "short" })} ${date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })} at ${date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()}`;
}

function reorderSidebar() {
    let sidebar = document.getElementById("right-column-inner");
    let sidebarOrder = Setting.getValue<{ include: string[]; exclude: string[] }>(
        "sidebarSectionOrder"
    );
    let excluded = sidebarOrder?.exclude || [];
    let included = Array.from(sidebarOrder?.include || []).reverse();

    for (let section of Array.from(SIDEBAR_SECTIONS).reverse()) {
        if (!included.includes(section.name) && !excluded.includes(section.name)) {
            if (section) {
                let element = document.querySelector(section.selector);
                if (element) {
                    sidebar?.insertAdjacentElement("afterbegin", element);
                }
            }
        }
    }

    for (let sectionName of included) {
        let section = SIDEBAR_SECTIONS_MAP[sectionName];
        if (section) {
            let element = document.querySelector(section.selector);
            if (element) {
                sidebar?.insertAdjacentElement("afterbegin", element);
            }
        }
    }

    for (let sectionName of excluded) {
        let section = SIDEBAR_SECTIONS_MAP[sectionName];
        if (section) {
            let element = document.querySelector<HTMLElement>(section.selector);
            if (element) {
                element.style.display = "none";
            }
        }
    }

    try {
        document.getElementById("todo")?.remove();
        let overdueHeading = document.querySelector(
            `${SIDEBAR_SECTIONS_MAP["Overdue"].selector} h4`
        );
        overdueHeading?.replaceWith(
            createElement("h3", [], {
                style: { textTransform: "capitalize" },
                textContent: overdueHeading.textContent?.toLowerCase(),
            })
        );
        let upcomingHeading = document.querySelector(
            `${SIDEBAR_SECTIONS_MAP["Upcoming"].selector} h4`
        );
        upcomingHeading?.replaceWith(
            createElement("h3", [], {
                style: { textTransform: "capitalize" },
                textContent: upcomingHeading.textContent?.toLowerCase(),
            })
        );
    } catch {}
}

async function createQuickAccess() {
    let rightCol = document.getElementById("right-column-inner");
    let linkWrap;

    let wrapper = createElement("div", ["quick-access-wrapper"], {}, [
        createElement("h3", ["h3-med"], { title: `Added by ${EXTENSION_NAME}` }, [
            createSvgLogo("splus-logo-inline"),
            createElement("span", [], { textContent: "Quick Access" }),
            createElement("a", ["quick-right-link", "splus-track-clicks"], {
                id: "quick-access-splus-settings",
                textContent: "Customize Sidebar",
                href: "#splus-settings#setting-input-sidebarSectionOrder",
            }),
        ]),
        createElement("div", ["date-header", "first"], {}, [
            createElement("h4", [], { textContent: "Pages" }),
        ]),
        (linkWrap = createElement("div", ["quick-link-wrapper"])),
    ]);

    const PAGES = [
        { textContent: "Grade Report", href: "/grades/grades", id: "quick-access-grades" },
        { textContent: "Courses", href: "/courses", id: "quick-access-courses" },
        { textContent: "Mastery", href: "/mastery", id: "quick-access-mastery" },
        { textContent: "Groups", href: "/groups", id: "quick-access-groups" },
        { textContent: "Messages", href: "/messages", id: "quick-access-messages" },
    ];

    for (let page of PAGES) {
        let a = linkWrap.appendChild(
            createElement("a", ["quick-link", "splus-track-clicks"], page)
        );
        a.dataset.splusTrackingContext = "Quick Access";
    }

    wrapper.appendChild(
        createElement("div", ["date-header"], {}, [
            createElement("h4", [], {}, [
                createElement("span", [], { textContent: "Courses" }),
                createElement("a", ["quick-right-link", "splus-track-clicks"], {
                    id: "quick-access-reorder",
                    textContent: "Reorder",
                    href: "/courses?reorder",
                }),
            ]),
        ])
    );

    try {
        let sectionsList = (await fetchApiJson(`users/${getUserId()}/sections`)).section;

        if (!sectionsList || sectionsList.length == 0) {
            wrapper.appendChild(
                createElement("p", ["quick-access-no-courses"], { textContent: "No courses found" })
            );
        } else {
            let courseOptionsButton;
            let iconImage;
            let courseIconsContainer;
            for (let section of sectionsList) {
                wrapper.appendChild(
                    createElement("div", ["quick-access-course"], {}, [
                        (iconImage = createElement("div", ["splus-course-icon"], {
                            dataset: {
                                courseTitle: `${section.course_title}: ${section.section_title}`,
                            },
                        })),
                        createElement("a", ["splus-track-clicks", "quick-course-link"], {
                            textContent: `${section.course_title}: ${section.section_title}`,
                            href: `/course/${section.id}`,
                            dataset: {
                                splusTrackingId: "quick-access-course-link",
                                splusTrackingContext: "Quick Access",
                            },
                        }),
                        (courseIconsContainer = createElement("div", ["icons-container"], {}, [
                            createElement("a", ["icon", "icon-grades", "splus-track-clicks"], {
                                href: `/course/${section.id}/student_grades`,
                                title: "Grades",
                                dataset: {
                                    splusTrackingId: "quick-access-grades-link",
                                    splusTrackingContext: "Quick Access",
                                },
                            }),
                            createElement("a", ["icon", "icon-mastery", "splus-track-clicks"], {
                                href: `/course/${section.id}/student_mastery`,
                                title: "Mastery",
                                dataset: {
                                    splusTrackingId: "quick-access-mastery-link",
                                    splusTrackingContext: "Quick Access",
                                },
                            }),
                            (courseOptionsButton = createElement(
                                "a",
                                ["icon", "icon-settings", "splus-track-clicks"],
                                {
                                    href: "#",
                                    dataset: {
                                        splusTrackingId: "quick-access-settings-link",
                                        splusTrackingContext: "Quick Access",
                                    },
                                }
                            )),
                        ])),
                    ])
                );

                let quickLink = Setting.getNestedValue<string>("courseQuickLinks", section.id);
                if (quickLink && quickLink !== "") {
                    courseIconsContainer.prepend(
                        createElement("a", ["icon", "icon-quicklink", "splus-track-clicks"], {
                            href: quickLink,
                            title: `Quick Link \n(${quickLink})`,
                            dataset: {
                                splusTrackingId: "quick-access-quicklink-link",
                                splusTrackingContext: "Quick Access",
                            },
                        })
                    );
                }

                iconImage.style.backgroundImage = `url(${chrome.runtime.getURL(
                    "imgs/fallback-course-icon.svg"
                )})`;

                courseOptionsButton.addEventListener("click", () =>
                    Modal.openModal("course-settings-modal", {
                        courseId: section.id,
                        courseName: `${section.course_title}: ${section.section_title}`,
                    })
                );
            }
        }
    } catch (err) {
        if (err === "noapikey") {
            wrapper.appendChild(
                createElement("div", ["quick-access-no-api"], {}, [
                    createElement("p", [], {
                        textContent:
                            "Please grant access to your enrolled courses in order to use this feature.",
                    }),
                    createButton("quick-access-grant-access", "Grant Access", () => {
                        location.pathname = "/api";
                    }),
                ])
            );
        } else {
            throw err;
        }
    }

    rightCol?.append(wrapper);
}

function getAssignmentId(url: string) {
    if (url.includes("/assignment/")) {
        return url.match(/assignment\/(\d+)/)?.[1];
    } else if (url.includes("/course/")) {
        // Discussion boards, maybe other assignments as well
        return url.match(/course\/\d+\/.*\/(\d+)/)?.[1];
    } else if (url.includes("/event/")) {
        // Calendar events
        return url.match(/event\/(\d+)/)?.[1];
    } else if (url.includes("/external_tool/")) {
        // External tools
        return url.match(/external_tool\/(\d+)/)?.[1];
    }

    return null;
}

function indicateSubmittedAssignments() {
    let upcomingList = document.querySelector(".upcoming-events .upcoming-list");
    const completionOverridesSetting = "assignmentCompletionOverrides";
    const assignCompleteClass = "splus-assignment-complete";
    const assignIncompleteClass = "splus-assignment-notcomplete";

    // checks on the backend if an assignment is complete (submitted)
    // does not check user overrides
    async function isAssignmentCompleteAsync(assignmentId: string | null) {
        if (assignmentId == null) {
            return false;
        }
        try {
            let revisionData = await fetchApiJson(`dropbox/${assignmentId}/${getUserId()}`);
            let revisions = revisionData.revision;

            return !!(revisions && revisions.length && !revisions[revisions.length - 1].draft);
        } catch (err) {
            Logger.warn(
                `Couldn't determine if assignment ${assignmentId} was complete. This is likely not a normal assignment.`
            );
            return false;
        }
    }

    // checks user override for assignment completion
    function isAssignmentMarkedComplete(assignmentId: string) {
        return !!Setting.getNestedValue(completionOverridesSetting, assignmentId);
    }

    function setAssignmentCompleteOverride(assignmentId: string, isComplete: boolean) {
        let overrides = Setting.getValue<Record<string, boolean>>(completionOverridesSetting);

        if (!overrides && !isComplete) return;
        else if (!overrides) overrides = {};

        if (!isComplete) {
            delete overrides[assignmentId];
        } else {
            overrides[assignmentId] = isComplete;
        }

        Setting.setValue(completionOverridesSetting, overrides);
    }

    function createAssignmentSubmittedCheckmarkIndicator(
        eventElement: HTMLElement,
        assignmentId: string
    ) {
        let elem = document.createElement("button");
        elem.classList.add("splus-completed-check-indicator");
        elem.addEventListener("click", function () {
            // if we're "faux-complete" and clicked, unmark the forced state
            if (
                eventElement.classList.contains(assignCompleteClass) &&
                isAssignmentMarkedComplete(assignmentId)
            ) {
                eventElement.classList.remove(assignCompleteClass);
                setAssignmentCompleteOverride(assignmentId, false);
                trackEvent("button_click", {
                    id: "splus-completed-check-indicator",
                    context: "Checklist",
                    value: "uncheck",
                    legacyTarget: "splus-completed-check-indicator",
                    legacyAction: "uncheck",
                    legacyLabel: "Checkmarks",
                });
                // TODO handle async nicely
                processAssignmentUpcomingAsync(eventElement);
                // if we're incomplete and click, force the completed state
            } else if (eventElement.classList.contains(assignIncompleteClass)) {
                eventElement.classList.remove(assignIncompleteClass);
                trackEvent("button_click", {
                    id: "splus-completed-check-indicator",
                    context: "Checklist",
                    value: "check",
                    legacyTarget: "splus-completed-check-indicator",
                    legacyAction: "check",
                    legacyLabel: "Checkmarks",
                });
                setAssignmentCompleteOverride(assignmentId, true);
                // TODO handle async nicely
                processAssignmentUpcomingAsync(eventElement);
            }
        });
        return elem;
    }

    // returns assignment ID for convenience
    async function processAssignmentUpcomingAsync(eventElement: HTMLElement) {
        let infotipElement = eventElement.querySelector<HTMLElement>(".infotip, .singleday");
        let assignmentElement = infotipElement?.querySelector<HTMLAnchorElement>("a[href]");

        if (!infotipElement || !assignmentElement) return null;

        let assignmentId = getAssignmentId(assignmentElement.href);

        if (!assignmentId) return null;

        // add a CSS class for both states, so we can distinguish 'loading' from known-(in)complete
        let isMarkedComplete = isAssignmentMarkedComplete(assignmentId);
        if (isMarkedComplete || (await isAssignmentCompleteAsync(assignmentId))) {
            Logger.log(
                `Marking assignment ${assignmentId} as complete ✔ (is force-marked complete? ${isMarkedComplete})`
            );
            eventElement.classList.add(assignCompleteClass);
        } else {
            eventElement.classList.add(assignIncompleteClass);
            Logger.log(`Assignment ${assignmentId} is not submitted`);
        }

        if (!eventElement.querySelector(".splus-completed-check-indicator")) {
            infotipElement.insertAdjacentElement(
                infotipElement.classList.contains("singleday") ? "afterbegin" : "afterend",
                createAssignmentSubmittedCheckmarkIndicator(eventElement, assignmentId)
            );
        }

        return assignmentId;
    }

    // Indicate submitted assignments in Upcoming
    async function indicateSubmitted() {
        Logger.log("Checking to see if upcoming assignments are submitted");
        let idSet: Set<string> = new Set();
        for (let upcomingList of document.querySelectorAll(".upcoming-list")) {
            switch (Setting.getValue("indicateSubmission")) {
                case "disabled":
                    break;
                case "strikethrough":
                    upcomingList.classList.add("splus-mark-completed-strikethrough");
                    break;
                case "hide":
                    upcomingList.classList.add("splus-mark-completed-hide");
                    break;
                case "check":
                default:
                    upcomingList.classList.add("splus-mark-completed-check");
                    break;
            }

            let upcomingEventElements = upcomingList.querySelectorAll<HTMLElement>(
                ".upcoming-event:not(.upcoming-subevents-block)"
            );

            for (let eventElement of upcomingEventElements) {
                try {
                    let idResult = await processAssignmentUpcomingAsync(eventElement);
                    if (!idResult) throw new Error("No assignment ID found");
                    idSet.add(idResult);
                } catch (err) {
                    Logger.error(
                        `Failed checking assignment '${
                            eventElement.querySelector<HTMLAnchorElement>(".infotip a[href]")?.href
                        }' : `,
                        err
                    );
                }
            }
        }

        // check if reload is present and visible on page
        let reloadButton = upcomingList?.querySelector<HTMLButtonElement>(
            "button.button-reset.refresh-button"
        );
        if (reloadButton && reloadButton.offsetParent !== null) {
            reloadButton.addEventListener("click", () =>
                setTimeout(() => {
                    indicateSubmitted();

                    try {
                        document.getElementById("todo")?.remove();
                        let overdueHeading = document.querySelector(
                            `${SIDEBAR_SECTIONS_MAP["Overdue"].selector} h4`
                        );
                        overdueHeading?.replaceWith(
                            createElement("h3", [], {
                                style: { textTransform: "capitalize" },
                                textContent: overdueHeading.textContent?.toLowerCase(),
                            })
                        );
                        let upcomingHeading = document.querySelector(
                            `${SIDEBAR_SECTIONS_MAP["Upcoming"].selector} h4`
                        );
                        upcomingHeading?.replaceWith(
                            createElement("h3", [], {
                                style: { textTransform: "capitalize" },
                                textContent: upcomingHeading.textContent?.toLowerCase(),
                            })
                        );
                    } catch {}
                }, 500)
            );
        } else {
            // loaded properly
            // clear out old assignments from local cache which aren't relevant anymore
            let overrides = Setting.getValue<Record<string, any>>(completionOverridesSetting);

            if (overrides) {
                for (var key in overrides) {
                    if (overrides.hasOwnProperty(key) && !idSet.has(key)) {
                        delete overrides[key];
                    }
                }
                Setting.setValue(completionOverridesSetting, overrides);
                Logger.info("Done clearing old overrides");
            }
        }
    }

    setTimeout(indicateSubmitted, 1000);
}

function getRecentlyCompletedDenominators() {
    let recentlyCompletedList = document.querySelector(
        ".recently-completed-wrapper .recently-completed-list"
    );

    async function getDirectAssignmentDenominatorAsync(sectionId: string, assignmentId: string) {
        try {
            let json = await fetchApiJson(`sections/${sectionId}/assignments/${assignmentId}`);
            return json.max_points;
        } catch (err) {
            return null;
        }
    }

    async function getAssignmentDenominatorAsync(sectionId: string, assignmentId: string) {
        if (assignmentId == null) {
            return null;
        }

        let directDenominator = await getDirectAssignmentDenominatorAsync(sectionId, assignmentId);
        if (directDenominator !== null && !Number.isNaN(directDenominator)) {
            Logger.debug(
                `Found direct denominator for assignment ${assignmentId} in section ${sectionId}: ${directDenominator}`
            );
            return directDenominator;
        }

        try {
            let json = await fetchApiJson(`users/${getUserId()}/grades?section_id=${sectionId}`);

            if (json.section.length === 0) {
                throw new Error("Assignment details could not be read");
            }

            const assignments: Record<string, any>[] = json.section[0].period.reduce(
                (prevVal: Record<string, any>[], curVal: Record<string, any>) =>
                    prevVal.concat(curVal.assignment),
                []
            ); //combines the assignment arrays from each period

            let denom = Number.parseFloat(
                assignments.filter(x => x.assignment_id == assignmentId)[0].max_points
            );

            Logger.debug(
                `Found indirect denominator for assignment ${assignmentId} in section ${sectionId}: ${denom}`
            );

            return denom;
        } catch (err) {
            Logger.error(
                `Failed finding denominator for assignment ${assignmentId} in section ${sectionId}`,
                err
            );
            return null;
        }
    }

    async function getSectionIdMap() {
        let sections = await fetchApiJson(`users/${getUserId()}/sections`);
        let sectionMap: Record<string, string> = {};

        for (let section of sections.section) {
            sectionMap[section.course_title + " : " + section.section_title] = section.id;
        }

        return sectionMap;
    }

    // Indicate submitted assignments in Upcoming
    async function getDenominators() {
        let sectionMap = await getSectionIdMap();

        for (let recentEvent of recentlyCompletedList?.querySelectorAll(
            ".recently-completed-event"
        ) || []) {
            try {
                let eventLink = recentEvent.querySelector<HTMLAnchorElement>("a[href]")!;
                let assignmentId = getAssignmentId(eventLink.href);
                let sectionId =
                    sectionMap[
                        recentEvent
                            .querySelector<HTMLElement>(
                                ".realm-title-course-title .realm-main-titles"
                            )!
                            .textContent!.trim()
                    ];

                if (sectionId && assignmentId) {
                    Logger.debug(
                        `Getting denominator for assignment ${assignmentId} in section ${sectionId}`
                    );
                    let denominator = await getAssignmentDenominatorAsync(sectionId, assignmentId);
                    Logger.debug(
                        `Got denominator for assignment ${assignmentId} in section ${sectionId}: ${denominator}`
                    );

                    if (denominator) {
                        let prevElement = recentEvent.querySelector(
                            "span.infotip.grade-infotip span.recently-completed-grade"
                        );

                        if (prevElement) {
                            let denominatorElement = createElement(
                                "span",
                                ["splus-recent-denominator"],
                                { textContent: ` / ${denominator}` }
                            );
                            prevElement.insertAdjacentElement("afterend", denominatorElement);
                        } else {
                            recentEvent.querySelector(
                                "span.recently-completed-grade"
                            )!.textContent += ` / ${denominator}`;
                        }
                    }
                }
            } catch (err) {
                Logger.error(
                    `Failed finding denominator for recent assignment '${
                        recentEvent.querySelector<HTMLAnchorElement>(".infotip a[href]")?.href
                    }' : `,
                    err
                );
            }
        }
    }

    setTimeout(getDenominators, 1000);
}
