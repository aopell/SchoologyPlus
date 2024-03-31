for (let e of document.querySelectorAll(".close")) {
    e.onclick = modalClose;
}

window.onclick = function (event) {
    if (modals.find(x => x.element == event.target)) {
        modalClose(event.target);
    }
};

function shouldProcessMutations(mutationList) {
    let processThis = false;

    // ensure we're processing more than an addition of something this very handler added
    for (let mutation of mutationList) {
        for (let addedElem of mutation.addedNodes) {
            if (
                addedElem.classList &&
                !addedElem.classList.contains("splus-addedtodynamicdropdown")
            ) {
                processThis = true;
                break;
            }
        }

        if (processThis) {
            break;
        }
    }

    return processThis;
}

let siteNavigationTileHelpers = {
    createSpacerTile: function () {
        return createElement("div", [
            "_3hM4e",
            "_3_a9F",
            "zJU7e",
            "util-width-zero-1OcAd",
            "_2oHes",
            "util-last-child-margin-right-zero-1DVn4",
            "splus-addedtodynamicdropdown",
        ]);
    },
    isSpacerTile: function (element) {
        return element.childElementCount == 0;
    },
    // tiles must be mutable; caller must not care what happens to it
    // spaceToTotal = desired width
    createTilesRow: function (tiles, spaceToTotal) {
        if (!spaceToTotal) {
            spaceToTotal = targetRowWidth;
        }

        while (tiles.length < spaceToTotal) {
            tiles.push(siteNavigationTileHelpers.createSpacerTile());
        }

        // the two obfuscated classes are the ones Schoology has on its rows
        return createElement("div", ["_1tpub", "Kluyr", "splus-addedtodynamicdropdown"], {}, tiles);
    },

    // selector: (actual content container) (thing which just holds the inner body) (row of tiles)
    rowSelector: 'div[role="menu"] ._3mp5E._24W2g._26UWf ._1tpub.Kluyr',
};

// courses dropdown changes
(function () {
    let coursesDropdownContainer;

    let coursesDropdownObserver = new MutationObserver(function (mutationList) {
        if (!shouldProcessMutations(mutationList)) {
            return;
        }

        Logger.log("Processing courses dropdown mutation");

        if (Setting.getValue("archivedCoursesButton") === "show") {
            // aims to select the original "My Courses" link in the dropdown
            let candidateLink = coursesDropdownContainer.querySelector(
                '.CjR09._8a6xl._1tpub > a[href="/courses"]._3ghFm'
            );
            if (candidateLink) {
                // the obfuscated class name is the one Schoology uses to float these links right
                let newContainer = createElement(
                    "div",
                    [
                        "courses-mycourses-droppeddown-link-container",
                        "splus-addedtodynamicdropdown",
                        "_3ghFm",
                    ],
                    {},
                    [
                        createElement(
                            "a",
                            ["floating-contained-link", "splus-addedtodynamicdropdown"],
                            {
                                href: "/courses",
                                textContent: "My Courses",
                            }
                        ),
                        createElement(
                            "a",
                            ["floating-contained-link", "splus-addedtodynamicdropdown"],
                            {
                                href: "/courses/mycourses/past",
                                textContent: "Past Courses",
                            }
                        ),
                    ]
                );

                candidateLink.replaceWith(newContainer);
            }
        }

        // rearrange spacing in the courses dropdown
        // Schoology has 4 tiles per row by default, we want 6
        const targetRowWidth = 6;

        let rowContainer;
        let tiles = [];

        let needsReorganization = false;

        for (let tilesRow of coursesDropdownContainer.querySelectorAll(
            siteNavigationTileHelpers.rowSelector
        )) {
            if (!rowContainer) {
                rowContainer = tilesRow.parentElement;
            }
            if (tilesRow.childElementCount != targetRowWidth) {
                needsReorganization = true;
            }
            for (let tile of tilesRow.children) {
                if (!siteNavigationTileHelpers.isSpacerTile(tile)) {
                    tiles.push(tile);
                }
            }
        }

        // used later, clone the complete tiles list
        let contentTiles = tiles.slice(0);

        if (needsReorganization) {
            let nodeToDelete;
            while (
                (nodeToDelete = coursesDropdownContainer.querySelector(
                    siteNavigationTileHelpers.rowSelector
                ))
            ) {
                nodeToDelete.remove();
            }

            while (tiles.length > 0) {
                rowContainer.appendChild(
                    siteNavigationTileHelpers.createTilesRow(
                        tiles.splice(0, targetRowWidth),
                        targetRowWidth
                    )
                );
            }
        }

        let tileWidthCap;

        if (contentTiles.length > 0) {
            tileWidthCap = window.getComputedStyle(contentTiles[0]).width;
        }

        // nicknames in courses dropdown
        // these need to be handled specially because it's not displayed as one contiguous block anymore
        for (let contentTile of contentTiles) {
            let cardData = contentTile.querySelector(".Card-card-data-17m6S");
            if (
                !cardData ||
                cardData.querySelector(".splus-coursesdropdown-nicknamed-dataset") ||
                cardData.childElementCount > 1
            ) {
                // not a course, or already handled
                continue;
            }

            let courseAlias;
            if (cardData.parentElement.href) {
                let courseLinkMatch = cardData.parentElement.href.split("/");
                if (courseLinkMatch) {
                    courseLinkMatch = courseLinkMatch.at(-2);
                }
                if (courseLinkMatch && Setting.getValue("courseAliases")) {
                    courseAlias = Setting.getValue("courseAliases")[courseLinkMatch];
                }
            }

            if (!courseAlias) {
                continue;
            }

            // create our splus-coursesdropdown-nicknamed-dataset
            // we can't delete the old one because theming uses data from it
            cardData.firstElementChild.style.display = "none";

            // Schoology's styling: by default, card data has:
            // course name, in blue, at top: div._3U8Br._2s0LQ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB
            // section title, in black, in middle (most emphasized, I think): div._1wP6w._23_WZ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB
            // school name, in smaller gray at bottom: div._2wOCj.xjR5v._2qcpH._17Z60._1Aph-.gs0RB

            let origCourseTitle = cardData.firstElementChild.querySelector(
                "div._3U8Br._2s0LQ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB"
            );
            let origSectionTitle = cardData.firstElementChild.querySelector(
                "div._1wP6w._23_WZ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB"
            );
            let origSchoolTitle = cardData.firstElementChild.querySelector(
                "div._2wOCj.xjR5v._2qcpH._17Z60._1Aph-.gs0RB"
            );

            // stylistically equivalent to the other card data, in terms of our class list for the container element
            // FIXME: there's a stylistic incongruity between a nicknamed course in the dropdown and a non-nicknamed one
            let newCardDataChild = createElement(
                "div",
                [
                    "_36sHx",
                    "_3M0N7",
                    "fjQuT",
                    "_1EyV_",
                    "splus-coursesdropdown-nicknamed-dataset",
                    "splus-addedtodynamicdropdown",
                ],
                {},
                [
                    createElement(
                        "div",
                        [
                            "_3U8Br",
                            "_1wP6w",
                            "_23_WZ",
                            "_2qcpH",
                            "_3ghFm",
                            "_17Z60",
                            "_1Aph-",
                            "gs0RB",
                        ],
                        { textContent: courseAlias }
                    ), // stylized like section title
                    createElement(
                        "div",
                        [
                            "_2wOCj",
                            "xjR5v",
                            "_2qcpH",
                            "_17Z60",
                            "_1Aph-",
                            "gs0RB",
                            "splus-coursealiasing-exempt",
                        ],
                        {
                            textContent:
                                origCourseTitle.textContent + ": " + origSectionTitle.textContent,
                        }
                    ), // original full title, stylized like school name
                    createElement(
                        "div",
                        ["_2wOCj", "xjR5v", "_2qcpH", "_17Z60", "_1Aph-", "gs0RB"],
                        { textContent: origSchoolTitle.textContent }
                    ), // school title, original styling and text
                ]
            );
            if (tileWidthCap) {
                newCardDataChild.style.maxWidth = tileWidthCap;
            }
            cardData.appendChild(newCardDataChild);
        }

        // reorder courses button
        let coursesHeader = coursesDropdownContainer.querySelector(".CjR09._8a6xl._1tpub > h2");
        if (coursesHeader && !coursesHeader.querySelector(".splus-coursesdropdown-reorder-btn")) {
            // https://www.flaticon.com/free-icon/sort_159800
            let newBtn = createElement(
                "img",
                ["splus-coursesdropdown-reorder-btn", "splus-addedtodynamicdropdown"],
                {
                    src: "https://cdn-icons-png.flaticon.com/512/690/690319.png",
                    title: "Reorder Courses",
                    alt: "Reorder Icon",
                }
            );
            newBtn.onclick = () => (location.href = "/courses?reorder");
            coursesHeader.appendChild(newBtn);
        }
    });

    for (let candidateLabel of document.querySelectorAll("#header nav ul > li button > span")) {
        if (candidateLabel.textContent == "Courses") {
            // a span inside a button inside a div (inside a li)
            coursesDropdownContainer = candidateLabel.parentElement.parentElement;

            // to make interaction throughout the rest of the codebase easier
            coursesDropdownContainer.parentElement.classList.add("splus-courses-navbar-button");
            break;
        }
    }

    if (!coursesDropdownContainer) {
        return;
    }

    coursesDropdownObserver.observe(coursesDropdownContainer, { childList: true, subtree: true });
})();

// groups dropdown changes
(function () {
    let groupsDropdownContainer;

    let groupsDropdownObserver = new MutationObserver(function (mutationList) {
        if (!shouldProcessMutations(mutationList)) {
            return;
        }

        Logger.log("Processing groups dropdown mutation");

        // rearrange spacing in the courses dropdown
        // Schoology has 4 tiles per row by default, we want 6
        // primarily we do this to match the courses dropdown
        const targetRowWidth = 6;

        let rowContainer;
        let tiles = [];

        let needsReorganization = false;

        for (let tilesRow of groupsDropdownContainer.querySelectorAll(
            siteNavigationTileHelpers.rowSelector
        )) {
            if (!rowContainer) {
                rowContainer = tilesRow.parentElement;
            }
            if (tilesRow.childElementCount != targetRowWidth) {
                needsReorganization = true;
            }
            for (let tile of tilesRow.children) {
                if (!siteNavigationTileHelpers.isSpacerTile(tile)) {
                    tiles.push(tile);
                }
            }
        }

        if (needsReorganization) {
            let nodeToDelete;
            while (
                (nodeToDelete = groupsDropdownContainer.querySelector(
                    siteNavigationTileHelpers.rowSelector
                ))
            ) {
                nodeToDelete.remove();
            }

            while (tiles.length > 0) {
                rowContainer.appendChild(
                    siteNavigationTileHelpers.createTilesRow(
                        tiles.splice(0, targetRowWidth),
                        targetRowWidth
                    )
                );
            }
        }
    });

    for (let candidateLabel of document.querySelectorAll("#header nav ul > li button > span")) {
        if (candidateLabel.textContent == "Groups") {
            // a span inside a button inside a div (inside a li)
            groupsDropdownContainer = candidateLabel.parentElement.parentElement;

            // to make interaction throughout the rest of the codebase easier
            groupsDropdownContainer.parentElement.classList.add("splus-groups-navbar-button");
            break;
        }
    }

    if (!groupsDropdownContainer) {
        return;
    }

    groupsDropdownObserver.observe(groupsDropdownContainer, { childList: true, subtree: true });
})();

// "More..." dialog changes
(function () {
    let navigationElementsContainer = document.querySelector("#header nav > ul:nth-child(1)");

    let fixNavButtons = function () {
        let moreNavElement = navigationElementsContainer.querySelector(
            'li > button[aria-label="More"]'
        );
        let alreadyTweakedResourcesBtn = navigationElementsContainer.querySelector(
            "li.splus-nav-resources-lowwidth"
        );
        let fakeGradesBtn = navigationElementsContainer.querySelector(
            "li.splus-nav-grades-directlink-lowwidth"
        );
        if (moreNavElement) {
            moreNavElement = moreNavElement.parentElement;
        } else {
            // in a high width case
            // we need to determine if this is a transition or if the changes are irrelevant
            if (alreadyTweakedResourcesBtn) {
                alreadyTweakedResourcesBtn.style.display = "initial";
            }
            if (fakeGradesBtn) {
                fakeGradesBtn.style.display = "none";
            }
        }

        if (!moreNavElement || moreNavElement.classList.contains("splus-moremenu-gradesreadded")) {
            return;
        }

        moreNavElement.classList.add("splus-moremenu-gradesreadded");

        // remove the resources button - we're going to replace it with a grade report button
        let resLink = moreNavElement.previousElementSibling;
        if (resLink.querySelector("a").href.endsWith("/resources")) {
            resLink.classList.add("splus-nav-resources-lowwidth");
            resLink.style.display = "none";

            let gradesBtn = document.createElement("li");
            gradesBtn.classList.add("_24avl");
            gradesBtn.classList.add("_3Rh90");
            gradesBtn.classList.add("splus-nav-grades-directlink-lowwidth");
            gradesBtn.innerHTML =
                '<a class="_1SIMq _2kpZl _3OAXJ _13cCs _3_bfp _2M5aC _24avl _3v0y7 _2s0LQ _3ghFm _3LeCL _31GLY _9GDcm _1D8fw util-height-six-3PHnk util-line-height-six-3lFgd util-text-decoration-none-1n0lI Header-header-button-active-state-3AvBm Header-header-button-1EE8Y sExtlink-processed" href="/grades/grades">Grades</a>';
            moreNavElement.insertAdjacentElement("beforebegin", gradesBtn);
        } else if (fakeGradesBtn) {
            if (alreadyTweakedResourcesBtn) {
                alreadyTweakedResourcesBtn.style.display = "none";
            }
            fakeGradesBtn.style.display = "initial";
        }
    };

    let navigationElementsObserver = new MutationObserver(function (mutationList) {
        if (!shouldProcessMutations(mutationList)) {
            return;
        }

        // spacing around the More... menu [reolace "Resources" with "Grades"]
        fixNavButtons();

        // the More... menu itself
        (function () {
            let moreMenuDropdownList = navigationElementsContainer.querySelector(
                'li > div[role="menu"] > ul.util-flex-shrink-zero-3HoBE:nth-child(1)'
            );
            if (
                !moreMenuDropdownList ||
                moreMenuDropdownList.classList.contains("splus-moremenuentries-gradesprocessed")
            ) {
                return;
            }

            moreMenuDropdownList.classList.add("splus-moremenuentries-gradesprocessed");

            // remove the grades optiony menu that's under "more"
            moreMenuDropdownList
                .querySelector('button[data-submenu="grades"]')
                .parentElement.remove();

            // first element child is the search bar
            // we want to insert directly after that
            let insertAfter = moreMenuDropdownList.firstElementChild;

            let masteryLink = document.createElement("li");
            // use Schoology's convoluted class list, as presented in the original
            masteryLink.innerHTML =
                '<a aria-label="Mastery Grades" href="/mastery" class="Header-header-button-active-state-3AvBm Header-header-drop-menu-3SaYV Header-header-drop-menu-item-3d3IZ _2JX1Q _1k0yk _1tpub _3_bfp _3ghFm xjR5v _3lLLU _2gJbx util-text-decoration-none-1n0lI">Mastery Grades</a>';

            insertAfter.insertAdjacentElement("afterend", masteryLink);

            let resourcesLink = document.createElement("li");
            resourcesLink.innerHTML =
                '<a aria-label="Resources" href="/resources" class="Header-header-button-active-state-3AvBm Header-header-drop-menu-3SaYV Header-header-drop-menu-item-3d3IZ _2JX1Q _1k0yk _1tpub _3_bfp _3ghFm xjR5v _3lLLU _2gJbx util-text-decoration-none-1n0lI">Resources</a>';

            insertAfter.insertAdjacentElement("afterend", resourcesLink);
        })();
    });

    navigationElementsObserver.observe(navigationElementsContainer, {
        childList: true,
        subtree: true,
    });

    // fix the nav buttons (for "fix" as defined above) immediately - this handles a page initially loading as low-width

    if (
        document.readyState === "complete" ||
        (document.readyState !== "loading" && !document.documentElement.doScroll)
    ) {
        fixNavButtons();
    } else {
        document.addEventListener(
            "DOMContentLoaded",
            function () {
                fixNavButtons();
            },
            false
        );
    }
})();

// Reorder UI custom icons
(function () {
    let docObserver = new MutationObserver(function (mutationList) {
        if (!shouldProcessMutations(mutationList)) {
            return;
        }

        // make sure the reorder UI is visible; if not, don't try the expensive query
        let reorderHeader = document.querySelector(
            "header.LGaPf h1._3eD4l._3UytQ._3v0y7._16XsF._8a6xl"
        );
        if (!reorderHeader || reorderHeader.textContent != "Reorder Courses") {
            return;
        }

        // cards in the reorder UI
        let reorderUiCards = document.querySelectorAll(
            'div._1Z0RM._1tpub._2V6ED._3xHd3.L1I_b._9GENG._3LeCL._34eht._349XD.fjQuT.uQOmx._17X0S._36TKt._3qXK_._3WTX2.Mcjpm._4iu5i.jDhMt._3WDJD.CrxjQ[role="dialog"][aria-labelledby*="reorder-ui"] div._1Z0RM._3skcp._5jizS._1tpub._1SnLN._3LeCL._3lLLU._2gJbx.Card-card-2rORL'
        );

        let reprocessPictures = [];

        for (let classCard of reorderUiCards) {
            let classImg = classCard.querySelector("img._2oHes");
            if (!classImg) {
                continue;
            }

            // div containing course, section, and school names
            let descDiv = classCard.querySelector("div._1wP6w._2s0LQ._2qcpH._1XYMV._17Z60._2oHes");

            // <COURSE NAME>: <SECTION NAME>
            let nameComponents = [];
            for (let descPart of descDiv.querySelectorAll("div:not([class])")) {
                nameComponents.push(descPart.textContent);
            }

            classImg.alt = "Profile picture for " + nameComponents.join(": ");
            reprocessPictures.push(classImg);
        }

        Theme.setProfilePictures(reprocessPictures);
    });

    docObserver.observe(document.body, { childList: true, subtree: true });
})();

async function createQuickAccess() {
    let rightCol = document.getElementById("right-column-inner");
    let linkWrap;

    let wrapper = createElement("div", ["quick-access-wrapper"], {}, [
        createElement("h3", ["h3-med"], { title: "Added by Schoology Plus" }, [
            createSvgLogo("splus-logo-inline"),
            // createElement("img", ["splus-logo-inline"], { src: chrome.runtime.getURL("imgs/plus-icon.png"), title: "Provided by Schoology Plus" }),
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

                let quickLink = Setting.getNestedValue("courseQuickLinks", section.id);
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
                    openModal("course-settings-modal", {
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

    rightCol.append(wrapper);
}

function getAssignmentId(url) {
    if (url.includes("/assignment/")) {
        return url.match(/assignment\/(\d+)/)[1];
    } else if (url.includes("/course/")) {
        // Discussion boards, maybe other assignments as well
        return url.match(/course\/\d+\/.*\/(\d+)/)[1];
    } else if (url.includes("/event/")) {
        // Calendar events
        return url.match(/event\/(\d+)/)[1];
    } else if (url.includes("/external_tool/")) {
        // External tools
        return url.match(/external_tool\/(\d+)/)[1];
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
    async function isAssignmentCompleteAsync(assignmentId) {
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
    function isAssignmentMarkedComplete(assignmentId) {
        return !!Setting.getNestedValue(completionOverridesSetting, assignmentId);
    }

    function setAssignmentCompleteOverride(assignmentId, isComplete) {
        isComplete = !!isComplete;

        let overrides = Setting.getValue(completionOverridesSetting);

        if (!overrides && !isComplete) return;
        else if (!overrides) overrides = {};

        if (!isComplete) {
            delete overrides[assignmentId];
        } else {
            overrides[assignmentId] = isComplete;
        }

        Setting.setValue(completionOverridesSetting, overrides);
    }

    function createAssignmentSubmittedCheckmarkIndicator(eventElement, assignmentId) {
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
    async function processAssignmentUpcomingAsync(eventElement) {
        let infotipElement = eventElement.querySelector(".infotip, .singleday");
        let assignmentElement = infotipElement.querySelector("a[href]");

        // TODO errorcheck the assignmentId match
        let assignmentId = getAssignmentId(assignmentElement.href);

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
        let idSet = new Set();
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

            let upcomingEventElements = upcomingList.querySelectorAll(
                ".upcoming-event:not(.upcoming-subevents-block)"
            );

            for (let eventElement of upcomingEventElements) {
                try {
                    idSet.add(await processAssignmentUpcomingAsync(eventElement));
                } catch (err) {
                    Logger.error(
                        `Failed checking assignment '${
                            eventElement.querySelector(".infotip a[href]")?.href
                        }' : `,
                        err
                    );
                }
            }
        }

        // check if reload is present and visible on page
        let reloadButton = upcomingList.querySelector("button.button-reset.refresh-button");
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
                                textContent: overdueHeading.textContent.toLowerCase(),
                            })
                        );
                        let upcomingHeading = document.querySelector(
                            `${SIDEBAR_SECTIONS_MAP["Upcoming"].selector} h4`
                        );
                        upcomingHeading?.replaceWith(
                            createElement("h3", [], {
                                style: { textTransform: "capitalize" },
                                textContent: upcomingHeading.textContent.toLowerCase(),
                            })
                        );
                    } catch {}
                }, 500)
            );
        } else {
            // loaded properly
            // clear out old assignments from local cache which aren't relevant anymore
            let overrides = Setting.getValue(completionOverridesSetting);

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

    async function getDirectAssignmentDenominatorAsync(assignmentId) {
        try {
            let json = await fetchApiJson(`sections/${sectionId}/assignments/${assignmentId}`);
            return json.max_points;
        } catch (err) {
            return null;
        }
    }

    async function getAssignmentDenominatorAsync(sectionId, assignmentId) {
        if (assignmentId == null) {
            return null;
        }

        let directDenominator = await getDirectAssignmentDenominatorAsync(assignmentId);
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

            const assignments = json.section[0].period.reduce(
                (prevVal, curVal) => prevVal.concat(curVal.assignment),
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
        let sectionMap = {};

        for (let section of sections.section) {
            sectionMap[section.course_title + " : " + section.section_title] = section.id;
        }

        return sectionMap;
    }

    // Indicate submitted assignments in Upcoming
    async function getDenominators() {
        let sectionMap = await getSectionIdMap();

        for (let recentEvent of recentlyCompletedList.querySelectorAll(
            ".recently-completed-event"
        )) {
            try {
                let eventLink = recentEvent.querySelector("a[href]");
                let assignmentId = getAssignmentId(eventLink.href);
                let sectionId =
                    sectionMap[
                        recentEvent
                            .querySelector(".realm-title-course-title .realm-main-titles")
                            .textContent.trim()
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
                            ).textContent += ` / ${denominator}`;
                        }
                    }
                }
            } catch (err) {
                Logger.error(
                    `Failed finding denominator for recent assignment '${
                        recentEvent.querySelector(".infotip a[href]")?.href
                    }' : `,
                    err
                );
            }
        }
    }

    setTimeout(getDenominators, 1000);
}

Logger.debug("Finished loading all.js");
