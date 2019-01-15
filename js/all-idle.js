function shouldProcessMutations(mutationList) {
    let processThis = false;

    // ensure we're processing more than an addition of something this very handler added
    for (let mutation of mutationList) {
        for (let addedElem of mutation.addedNodes) {
            if (addedElem.classList && !addedElem.classList.contains("splus-addedtodynamicdropdown")) {
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
        return createElement("div", ["_3hM4e", "_3_a9F", "zJU7e", "util-width-zero-1OcAd", "_2oHes", "util-last-child-margin-right-zero-1DVn4", "splus-addedtodynamicdropdown"]);
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
    rowSelector: "div[role=\"menu\"] ._3mp5E._24W2g._26UWf ._1tpub.Kluyr"
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
            let candidateLink = coursesDropdownContainer.querySelector(".CjR09._8a6xl._1tpub > a[href=\"/courses\"]._3ghFm");
            if (candidateLink) {
                // the obfuscated class name is the one Schoology uses to float these links right
                let newContainer = createElement("div", ["courses-mycourses-droppeddown-link-container", "splus-addedtodynamicdropdown", "_3ghFm"], {}, [
                    createElement("a", ["floating-contained-link", "splus-addedtodynamicdropdown"], {
                        href: "/courses",
                        textContent: "My Courses"
                    }),
                    createElement("a", ["floating-contained-link", "splus-addedtodynamicdropdown"], {
                        href: "/courses/mycourses/past",
                        textContent: "Past Courses"
                    })
                ]);

                candidateLink.replaceWith(newContainer);
            }
        }

        // rearrange spacing in the courses dropdown
        // Schoology has 4 tiles per row by default, we want 6
        const targetRowWidth = 6;

        let rowContainer;
        let tiles = [];

        let needsReorganization = false;

        for (let tilesRow of coursesDropdownContainer.querySelectorAll(siteNavigationTileHelpers.rowSelector)) {
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
            while (nodeToDelete = coursesDropdownContainer.querySelector(siteNavigationTileHelpers.rowSelector)) {
                nodeToDelete.remove();
            }

            while (tiles.length > 0) {
                rowContainer.appendChild(siteNavigationTileHelpers.createTilesRow(tiles.splice(0, targetRowWidth), targetRowWidth));
            }
        }

        // nicknames in courses dropdown
        // these need to be handled specially because it's not displayed as one contiguous block anymore
        for (let contentTile of contentTiles) {
            let cardData = contentTile.querySelector(".Card-card-data-17m6S");
            if (!cardData || cardData.querySelector(".splus-coursesdropdown-nicknamed-dataset") || cardData.childElementCount > 1) {
                // not a course, or already handled
                continue;
            }

            let courseAlias;
            if (cardData.parentElement.href) {
                let courseLinkMatch = cardData.parentElement.href.match(/\/course\/(\d+)\/?$/);
                if (courseLinkMatch) {
                    courseLinkMatch = courseLinkMatch[1];
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

            let origCourseTitle = cardData.firstElementChild.querySelector("div._3U8Br._2s0LQ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB");
            let origSectionTitle = cardData.firstElementChild.querySelector("div._1wP6w._23_WZ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB");
            let origSchoolTitle = cardData.firstElementChild.querySelector("div._2wOCj.xjR5v._2qcpH._17Z60._1Aph-.gs0RB");

            // stylistically equivalent to the other card data, in terms of our class list for the container element
            // FIXME: there's a stylistic incongruity between a nicknamed course in the dropdown and a non-nicknamed one
            let newCardDataChild = createElement("div", ["_36sHx", "_3M0N7", "fjQuT", "_1EyV_", "splus-coursesdropdown-nicknamed-dataset", "splus-addedtodynamicdropdown"], {}, [
                createElement("div", ["_1wP6w", "_23_WZ", "_2qcpH", "_3ghFm", "_17Z60", "_1Aph-", "gs0RB"], { textContent: courseAlias }), // stylized like section title
                createElement("div", ["_2wOCj", "xjR5v", "_2qcpH", "_17Z60", "_1Aph-", "gs0RB", "splus-coursealiasing-exempt"], { textContent: origCourseTitle.textContent + ": " + origSectionTitle.textContent }), // original full title, stylized like school name
                createElement("div", ["_2wOCj", "xjR5v", "_2qcpH", "_17Z60", "_1Aph-", "gs0RB"], { textContent: origSchoolTitle.textContent }) // school title, original styling and text
            ]);
            cardData.appendChild(newCardDataChild);
        }

        // reorder courses button
        let coursesHeader = coursesDropdownContainer.querySelector(".CjR09._8a6xl._1tpub > h2");
        if (coursesHeader && !coursesHeader.querySelector(".splus-coursesdropdown-reorder-btn")) {
            // https://www.flaticon.com/free-icon/sort_159800
            let newBtn = createElement("img", ["splus-coursesdropdown-reorder-btn", "splus-addedtodynamicdropdown"], { src: "https://image.flaticon.com/icons/svg/159/159800.svg", title: "Reorder Courses", alt: "Reorder Icon" });
            newBtn.onclick = () => document.querySelector("#reorder-ui button.link-btn").click();
            coursesHeader.appendChild(newBtn);
        }
    });

    for (let candidateLabel of document.querySelectorAll("#header nav ul > li span._1D8fw")) {
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

    if (!document.getElementById("reorder-ui")) {
        let reorderUiContainer = document.createElement("div");
        reorderUiContainer.style.display = "none";
        reorderUiContainer.innerHTML = '<div id="reorder-ui"><div class="_3W1Kw"><div><button class="link-btn" role="button" style="height: 100%;"><span class="Reorder-reorder-icon-15wl2"></span>Reorder Courses</button></div></div></div>';
        document.body.appendChild(reorderUiContainer);
        let newScript = createElement("script", [], { src: "https://ui.schoology.com/platform/reorder-ui/bundle.0.1.1.js", async: true, id: "reorder-ui-script" });

        // start the fetch langprops task
        fetch(chrome.runtime.getURL("/lib/data/schoology-reorder-ui-langprops.json"))
            .then(x => x.text())
            .then(x => newScript.dataset.props = x)
            .then(() => reorderUiContainer.appendChild(newScript));
    }
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

        for (let tilesRow of groupsDropdownContainer.querySelectorAll(siteNavigationTileHelpers.rowSelector)) {
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
            while (nodeToDelete = groupsDropdownContainer.querySelector(siteNavigationTileHelpers.rowSelector)) {
                nodeToDelete.remove();
            }

            while (tiles.length > 0) {
                rowContainer.appendChild(siteNavigationTileHelpers.createTilesRow(tiles.splice(0, targetRowWidth), targetRowWidth));
            }
        }
    });

    for (let candidateLabel of document.querySelectorAll("#header nav ul > li span._1D8fw")) {
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

// hack for course aliases
(async function () {
    let applyCourseAliases = null;
    let applyThemeIcons = null;

    // PREP COURSE ICONS
    // course dashboard
    let mainInner = document.getElementById("main-inner");
    let courseDashboard = mainInner && window.location.pathname == "/home/course-dashboard";
    let hasAppliedDashboard = false;

    // duplicate of logic in themes.js; needed because we do mutation logic here
    let skipOverriddenIcons = Setting.getValue("courseIcons") === "defaultOnly";

    if (Setting.getValue("courseIcons") != "disabled") {
        applyThemeIcons = function () {
            let ancillaryList = null;
            if (courseDashboard && !hasAppliedDashboard) {
                let cardLenses = mainInner.querySelectorAll(".course-dashboard .sgy-card-lens");
                if (cardLenses && cardLenses.length > 0) {
                    ancillaryList = [];
                    //Course icons on "Course Dashboard" view of homepage
                    for (let tile of cardLenses) {
                        // check if not default icon
                        // underlying method does this, but since we mutate we have to do it too
                        if (skipOverriddenIcons && !((tile.firstChild.data || tile.firstChild.src || "").match(defaultCourseIconUrlRegex))) {
                            continue;
                        }

                        // clear children
                        while (tile.firstChild) {
                            tile.removeChild(tile.firstChild);
                        }
                        // create an img
                        let img = document.createElement("img");
                        // find course name
                        // note the context footer does linebreaks, so we have to undo that
                        let courseName = tile.parentElement.querySelector(".course-dashboard__card-context-title").textContent.replace("\n", " ");
                        img.alt = "Profile picture for " + courseName;
                        // to mirror original styling and behavior
                        img.classList.add("course-dashboard__card-lens-svg");
                        img.tabIndex = -1;

                        tile.appendChild(img);
                        ancillaryList.push(img);
                    }
                    hasAppliedDashboard = true;
                }
            }
            Theme.setProfilePictures(ancillaryList);
        };
        applyThemeIcons();
    }

    // PREP COURSE ALIASES
    if (Setting.getValue("courseAliases")) {
        let myClasses = (await fetchApiJson(`/users/${getUserId()}/sections`)).section;

        // get course info for courses with aliases that I'm not currently enrolled in, concurrently
        myClasses.push(...await Promise.all(Object.keys(Setting.getValue("courseAliases")).filter(aliasedCourseId => !myClasses.some(x => x.id == aliasedCourseId))
            .filter(aliasedCourseId => Setting.getValue("courseAliases")[aliasedCourseId]) // only fetch if the alias hasn't subsequently been cleared
            .map(id => fetchApi(`/sections/${id}`).then(resp => resp.json().catch(rej => null), rej => null))));

        Logger.log("Classes loaded, building alias stylesheet");
        // https://stackoverflow.com/a/707794 for stylesheet insertion
        let sheet = window.document.styleSheets[0];

        for (let aliasedCourseId in Setting.getValue("courseAliases")) {
            // https://stackoverflow.com/a/18027136 for text replacement
            sheet.insertRule(`.course-name-wrapper-${aliasedCourseId} {
            visibility: hidden;
            word-spacing:-999px;
            letter-spacing: -999px;
        }`, sheet.cssRules.length);
            sheet.insertRule(`.course-name-wrapper-${aliasedCourseId}:after {
            content: "${Setting.getValue("courseAliases")[aliasedCourseId]}";
            visibility: visible;
            word-spacing:normal;
            letter-spacing:normal; 
        }`, sheet.cssRules.length);
        }

        Logger.log("Applying aliases");
        applyCourseAliases = function (mutationsList) {
            let rootElement = document.body;

            if (mutationsList && mutationsList.length == 0) {
                return;
            }

            if (mutationsList && mutationsList.length == 1) {
                rootElement = mutationsList[0].target;
            }

            for (let jsonCourse of myClasses) {
                if (!jsonCourse || !Setting.getValue("courseAliases")[jsonCourse.id]) {
                    continue;
                }

                let findTexts = [jsonCourse.course_title + ": " + jsonCourse.section_title, jsonCourse.course_title + " : " + jsonCourse.section_title];
                let wrapClassName = "course-name-wrapper-" + jsonCourse.id;

                for (let findText of findTexts) {
                    findAndReplaceDOMText(rootElement, {
                        find: findText,
                        wrap: "span",
                        wrapClass: wrapClassName,
                        portionMode: "first",
                        filterElements: (elem) => !elem.classList || !elem.classList.contains("splus-coursealiasing-exempt")
                    });

                    document.title = document.title.replace(findText, Setting.getValue("courseAliases")[jsonCourse.id]);
                }

                // cleanup: if we run this replacement twice, we'll end up with unnecessary nested elements <special-span><special-span>FULL COURSE NAME</special-span></special-span>
                let nestedSpan;
                while (nestedSpan = document.querySelector(`span.${wrapClassName}>span.${wrapClassName}`)) {
                    let parentText = nestedSpan.textContent;
                    let parentElem = nestedSpan.parentElement;
                    while (parentElem.firstChild) {
                        parentElem.firstChild.remove();
                    }
                    parentElem.textContent = parentText;
                }
            }

        };
        applyCourseAliases();
    }

    // MUTATION HOOK
    let isModifying = false;

    // beware of performance implications of observing document.body
    let aliasPrepObserver = new MutationObserver(function (mutationsList) {
        if (isModifying) {
            return;
        }

        isModifying = true;

        let filteredList = mutationsList.filter(function (mutation) {
            for (let cssClass of mutation.target.classList) {
                // target blacklist
                // we don't care about some (especially frequent and performance-hurting) changes
                if (cssClass.startsWith("course-name-wrapper-")) {
                    // our own element, we don't care
                    return false;
                }
                if (cssClass.includes("pendo")) {
                    // Schoology's analytics platform, we don't care
                    return false;
                }
            }

            return true;
        });

        // this delegate has the conditional within it
        if (applyCourseAliases) {
            applyCourseAliases(filteredList);
        }

        if (applyThemeIcons && filteredList.length > 0) {
            applyThemeIcons();
        }

        isModifying = false;
    });
    // necessary (again) because on *some* pages, namely course-dashboard, we have a race condition
    // if the main body loads after our initial check but before the observe call (e.g. during our network awaits), 
    // we won't catch the update until a separate unrelated DOM change
    // this is not as much of an issue with aliases because we do our initial check there after the network awaits,
    // which are by far the longest-running part of this code
    if (applyThemeIcons) {
        applyThemeIcons();
    }
    aliasPrepObserver.observe(document.body, { childList: true, subtree: true });

})();

// show grades on notifications dropdown
(function () {
    let notifsMenuContainer = document.querySelector("#header nav button[aria-label$=\"notifications\"]").parentElement;
    let gradesLoadedPromise = (async function () {
        let myGrades = await fetchApiJson(`/users/${getUserId()}/grades`);

        let loadedGradeContainer = {};

        // assignment grades
        // period is an array of object
        // period[x].assignment is an array of grade objects (the ones we want to enumerate)
        for (let assignment of myGrades.section.reduce((oa, thisClassGrades) => oa.concat(thisClassGrades.period.reduce((accum, curr) => accum.concat(curr.assignment), [])), [])) {
            loadedGradeContainer[assignment.assignment_id] = assignment;
            Object.freeze(assignment);
        }

        Object.freeze(loadedGradeContainer);

        return loadedGradeContainer;
    })();

    let notifsDropdownObserver = new MutationObserver(function (mutationList) {
        if (!shouldProcessMutations(mutationList)) {
            return;
        }

        let coll = notifsMenuContainer.querySelectorAll("div[role=\"menu\"] ._2awxe._3skcp._1tpub a[href^=\"/assignment/\"]");
        if (coll.length > 0) {
            Logger.log("NotifsDropdown observation has links to process - processing now");
        }

        // obfuscated classnames identify the div containers of our individual notifications (explicitly excluding the "View All" button)
        for (let gradeLink of coll) {
            if (gradeLink.offsetParent == null) {
                // hidden and therefore irrelevant
                continue;
            }

            // correct the showing of "N other people" on assignment/grade notifications which should read "N other assignments"
            if (!gradeLink.parentElement.classList.contains("splus-people-are-assignments-corrected")) {
                let parentElem = gradeLink.parentElement;
                if (parentElem.firstElementChild.textContent.includes("grade") && parentElem.firstElementChild.textContent.includes("posted")) {
                    // a grades posted notification
                    for (let candidateSpan of parentElem.getElementsByTagName("span")) {
                        if (candidateSpan.textContent.includes("other people")) {
                            candidateSpan.textContent = candidateSpan.textContent.replace("other people", "other assignments");
                        }
                    }
                    parentElem.classList.add("splus-people-are-assignments-corrected");
                }
            }

            let assignmentId = (gradeLink.href.match(/\d+/) || [])[0];

            if (!assignmentId) {
                continue;
            }

            if (gradeLink.parentElement.querySelector(".grade-data.splus-addedtodynamicdropdown")) {
                // already processed
                continue;
            }

            gradesLoadedPromise.then(gradeContainer => {
                gradeLink.insertAdjacentElement("afterend", createElement("span", ["grade-data", "splus-addedtodynamicdropdown"], { textContent: ` (${gradeContainer[assignmentId].grade} / ${gradeContainer[assignmentId].max_points || 0})` }))
            });
        }

    });

    notifsDropdownObserver.observe(notifsMenuContainer, { childList: true, subtree: true });

    if (window.location.pathname == "/home/notifications") {
        // notifications page: legacy style

        let processItemList = function (itemList) {
            for (let gradeLink of itemList.querySelectorAll(".s-edge-type-grade-add a[href^=\"/assignment/\"]")) {
                if (gradeLink.offsetParent == null) {
                    // hidden and therefore irrelevant
                    continue;
                }

                let assignmentId = (gradeLink.href.match(/\d+/) || [])[0];

                if (!assignmentId) {
                    continue;
                }

                gradesLoadedPromise.then(gradeContainer => {
                    gradeLink.insertAdjacentElement("afterend", createElement("span", ["grade-data"], { textContent: ` (${gradeContainer[assignmentId].grade} / ${gradeContainer[assignmentId].max_points || 0})` }))
                });
            };
        }

        let itemList = document.querySelector("#main-inner .item-list ul.s-notifications-mini");

        let oldNotifsObserver = new MutationObserver(function () {
            processItemList(itemList);
        });

        processItemList(itemList);

        oldNotifsObserver.observe(itemList, { childList: true });
    }

    let moreGradesModalObserver = new MutationObserver(mutationsList => {
        for (let mutation of mutationsList) {
            for (let addedNode of mutation.addedNodes) {
                if (!addedNode.classList.contains("popups-box")) {
                    continue;
                }

                if (addedNode.querySelector(".popups-title .title").textContent.trim().toLowerCase() != "grades") {
                    continue;
                }

                for (let assignmentWrapper of addedNode.querySelectorAll(".popups-body .item-list li .user-item")) {
                    if (assignmentWrapper.offsetParent == null) {
                        // hidden and therefore irrelevant
                        continue;
                    }

                    let assignmentId = assignmentWrapper.getElementsByTagName("a")[1].href.match(/\d+/)[0];

                    gradesLoadedPromise.then(gradeContainer => {
                        assignmentWrapper.insertAdjacentElement("beforeend", createElement("span", ["grade-data"], { textContent: `${gradeContainer[assignmentId].grade} / ${gradeContainer[assignmentId].max_points || 0}` }))
                    });
                }
                return;
            }
        }
    });

    moreGradesModalObserver.observe(document.body, { childList: true });
})();