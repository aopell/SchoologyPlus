// add tooltip to assignments
// Schoology uses a jQuery plugin called tipsy to do its native tooltips; we use the same for consistency
// https://github.com/MartinMartimeo/tipsy
// we use an ancient jquery version because our upstream library does

"use strict";

(async function () {
    // utility function
    function escapeForHtml(text) {
        let tempElem = document.createElement("span");
        $(tempElem).text(text);
        return tempElem.innerText;
    }

    /**
     * Wraps the given base string in syntax for an HTML element.
     * @param {string} baseString The HTML syntax string to wrap.
     * @param {string} wrapperTag The tag name of the wrapper element to use.
     * @param {Object} wrapperProps Properties to add to the wrapper element (they will be quoted). Escaping will not be performed; it is the caller's responsibility
     * @returns The given HTML syntax wrapped in a tag as specified.
     */
    function wrapHtml(baseString, wrapperTag, wrapperProps) {
        let resultString = "<" + wrapperTag;
        if (wrapperProps) {
            for (let prop in wrapperProps) {
                resultString += ` ${prop}="${wrapperProps[prop]}"`;
            }
        }
        resultString += ">";
        resultString += baseString;
        resultString += "</" + wrapperTag + ">";

        return resultString;
    }

    let gradeLoadHooks = [];
    let documentLoadHooks = {}; // dictionary: assignment id -> async function handling resulting load
    let userId;

    // FIXME the container element in question (the list of assignments) can be recreated; we should handle this case

    // assignment tooltips
    $("#course-profile-materials tr.type-assignment").each((index, value) => {
        let loadedGrade = "Loading...";
        $(value).find(".item-title>a").tipsy({ gravity: "n", html: true, title: () => loadedGrade });

        let assignmentId = value.id.match(/\d+/)[0];

        gradeLoadHooks.push(function (grades) {
            let innerContent = "";

            if (!grades.grades[assignmentId]) {
                innerContent = "<span class=\"error-message\">No data found</span>";
            } else {
                let assignment = grades.grades[assignmentId];
                if (assignment.exception == 1) {
                    // excused
                    innerContent += "<span class=\"exception-excused\">Excused</span>";
                } else if (assignment.exception == 2) {
                    // incomplete
                    innerContent += "<span class=\"exception-incomplete\">Incomplete</span>";
                } else if (assignment.exception == 3) {
                    // missing
                    innerContent += "<span class=\"exception-missing\">Missing</span>";
                } else if (assignment.grade !== null) {
                    // normal grade status, has a grade
                    let gradeElem = wrapHtml(escapeForHtml(assignment.grade), "span", { class: "tooltip-grade-numerator" });
                    if (assignment.max_points) {
                        gradeElem += " / ";
                        gradeElem += wrapHtml(escapeForHtml(assignment.max_points, "span", { class: "tooltip-grade-denominator" }));
                    } else {
                        gradeElem += " pts";
                    }
                    innerContent += wrapHtml(gradeElem, "span", { class: "tooltip-grade-info" });
                } else {
                    // normal grade status, ungraded by teacher
                    innerContent += "<span>No Grade</span>";
                }

                // strange denominator display circumstances
                if (assignment.exception || assignment.grade === null) {
                    let ptStr = !assignment.max_points ? "EC" : `${assignment.max_points} pts`;
                    innerContent += ` <span class=\"exception-max-pts-info\">(${ptStr})</span>`;
                }

                innerContent = wrapHtml(innerContent, "p");

                let footerElements = [];
                if (assignment.category_id && grades.categories[assignment.category_id]) {
                    footerElements.push(wrapHtml(escapeForHtml(grades.categories[assignment.category_id].title), "span", { class: "tooltip-category" }));
                }
                if (grades.dropboxes[assignmentId]) {
                    let validSubmissions = grades.dropboxes[assignmentId].filter(x => !x.draft);
                    if (validSubmissions.length == 0) {
                        footerElements.push(wrapHtml("Not Submitted", "span", { class: "tooltip-not-submitted" }));
                    } else {
                        let submittedStatus = "Submitted";
                        if (validSubmissions[validSubmissions.length - 1].late) {
                            submittedStatus += " (Late)";
                            submittedStatus = wrapHtml(submittedStatus, "span", { class: "tooltip-submitted-late" });
                        } else {
                            submittedStatus = wrapHtml(submittedStatus, "span", { class: "tooltip-submitted-ontime" });
                        }
                        footerElements.push(submittedStatus);
                    }
                }

                if (footerElements.length > 0) {
                    innerContent += wrapHtml(footerElements.join("<span class=\"tooltip-horiz-divider\"> | </span>"), "p", { class: "tooltip-footer" });
                }
            }

            loadedGrade = wrapHtml(innerContent, "div", { class: "assignment-tooltip" });
        });
    });

    // document tooltips
    $("#course-profile-materials tr.type-document").each(async function (index, value) {
        let loadedText = "Loading...";
        // title already has a tooltip (full filename), so we'll use the filesize instead
        $(value).find(".attachments-file-name .attachments-file-size").tipsy({ gravity: "w", html: true, title: () => loadedText });

        let materialId = value.id.match(/\d+/)[0];
        documentLoadHooks[materialId] = async function (apiData, pdf) {

        };
    });

    let classId = window.location.pathname.match(/\/course\/(\d+)\/materials/)[1]; // ID of current course ("section"), as a string
    let myApiKeys = await getApiKeys();
    userId = myApiKeys[2];


    if (gradeLoadHooks.length > 0) {
        // load grade information for this class, call grade hooks

        // this object contains ALL grades from this Schoology account, "keyed" by annoying IDs
        // TODO Schoology API docs say this is paged, we should possible account for that? 
        let myGrades = await (await fetch(`https://api.schoology.com/v1/users/${userId}/grades`, {
            headers: createApiAuthenticationHeaders(myApiKeys)
        })).json();

        let thisClassGrades = myGrades.section.find(x => x.section_id == classId);

        // start building our return object, which will follow a nicer format
        let retObj = {};
        retObj.categories = {};
        retObj.grades = {};
        retObj.assignments = {};
        retObj.dropboxes = {};

        // gradebook categories
        for (let gradeCategory of thisClassGrades.grading_category) {
            retObj.categories[gradeCategory.id] = gradeCategory;
            Object.freeze(gradeCategory);
        }

        Object.freeze(retObj.categories);

        // assignment grades
        // period is an array of object
        // period[x].assignment is an array of grade objects (the ones we want to enumerate)
        for (let assignment of thisClassGrades.period.reduce((accum, curr) => accum.concat(curr.assignment), [])) {
            retObj.grades[assignment.assignment_id] = assignment;
            Object.freeze(assignment);
        }

        Object.freeze(retObj.grades);

        // assignments
        // need a separate API call
        let ourAssignments = await (await fetch(`https://api.schoology.com/v1/sections/${classId}/assignments`, {
            headers: createApiAuthenticationHeaders(myApiKeys)
        })).json();

        for (let assignment of ourAssignments.assignment) {
            retObj.assignments[assignment.id] = assignment;
            Object.freeze(assignment);

            // string "0" or "1" from API
            if (+assignment.allow_dropbox) {
                // "dropboxes," or places to submit documents via Schoology
                // another API call
                retObj.dropboxes[assignment.id] = (await (await fetch(`https://api.schoology.com/v1/sections/${classId}/submissions/${assignment.id}/${userId}`, {
                    headers: createApiAuthenticationHeaders(myApiKeys)
                })).json()).revision;
                Object.freeze(retObj.dropboxes[assignment.id]);
            }
        }

        Object.freeze(retObj.assignments);
        Object.freeze(retObj.dropboxes);
        Object.freeze(retObj);

        console.log("Assignment data loaded, creating tooltips");

        // call our event listeners
        for (let eventHook of gradeLoadHooks) {
            eventHook(retObj);
        }
    }

    // initialize pdfjs
    // FIXME this is an awful hack because we're trying to avoid webpack and pdfjs is a module
    let injectScript = document.createElement("script");
    injectScript.text = await (await fetch(chrome.runtime.getURL("js/materials.pdfhandler.mjs"))).text();
    injectScript.type = "module";
    document.head.appendChild(injectScript);

    let baseLocation = `${location.protocol}//${location.host}${location.pathname}`; // location without querystring or other botherances
    for (let docToLoad in documentLoadHooks) {
        let apiMetadata = (await (await fetch(`https://api.schoology.com/v1/sections/${classId}/documents/${docToLoad}`, {
            headers: createApiAuthenticationHeaders(myApiKeys)
        })).json());
        // TODO this isn't the cleanest, not sure if this is accurate for all cases
        let fileData = apiMetadata.attachments.files.file[0];
        if (fileData.converted_filemime == "application/pdf" && fileData.converted_download_path) {
            let pdfContentBuffer = await (await fetch(apiMetadata.converted_download_path, {
                headers: createApiAuthenticationHeaders(myApiKeys)
            })).arrayBuffer();

            await documentLoadHooks[docToLoad](apiMetadata, null); // await PDFJS.getDocument({ data: new Uint8Array(pdfContentBuffer) }));
        } else {
            await documentLoadHooks[docToLoad](apiMetadata, null);
        }
    }
})();

