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

Logger.debug("Finished loading all.js");
