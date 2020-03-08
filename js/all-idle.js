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
    function appendGradeToLink(gradeLink, assignmentId, gradeContainer, isDynamic) {
        if (!gradeLink.parentElement.querySelector(`.grade-data${isDynamic ? ".splus-addedtodynamicdropdown" : ""}[data-assignment-id=\"${assignmentId}\"]`)) {
            // to control for already processed - race condition from the above
            let effectiveGrade = gradeContainer[assignmentId].grade;
            let effectiveTitle = undefined;
            if (effectiveGrade === null || effectiveGrade === undefined) {
                // exception: 1 excused
                // 2 incomplete
                // 3 missing
                if (gradeContainer[assignmentId].exception == 1) {
                    effectiveGrade = "—";
                    effectiveTitle = "Excused";
                } else if (gradeContainer[assignmentId].exception == 2) {
                    effectiveGrade = "*";
                    effectiveTitle = "Incomplete";
                } else if (gradeContainer[assignmentId].exception == 3) {
                    effectiveGrade = "0*";
                    effectiveTitle = "Missing";
                }
            }
            gradeLink.insertAdjacentElement("afterend", createElement("span", isDynamic ? ["grade-data", "splus-addedtodynamicdropdown"] : ["grade-data"], { textContent: ` (${effectiveGrade} / ${gradeContainer[assignmentId].max_points || 0})`, dataset: { assignmentId: assignmentId }, title: effectiveTitle }));
        }
    }

    let notifsMenuContainer = document.querySelector("#header nav button[aria-label$=\"notifications\"], #header nav button[aria-label$=\"notification\"]").parentElement;
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

            gradesLoadedPromise.then(gradeContainer => {
                appendGradeToLink(gradeLink, assignmentId, gradeContainer, true);
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
                    appendGradeToLink(gradeLink, assignmentId, gradeContainer, false);
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

// Prevent scrolling when a modal is open
(function () {
    new MutationObserver((mutations, observer) => {
        if (document.getElementById("body").getAttribute("aria-hidden") == "true") {
            document.documentElement.style.overflow = "hidden";
        } else {
            document.documentElement.style.overflow = "";
        }
    }).observe(document.getElementById("body"), { attributes: true, attributeFilter: ["aria-hidden"] });
})();