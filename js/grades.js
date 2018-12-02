const timeout = ms => new Promise(res => setTimeout(res, ms));

$.contextMenu({
    selector: ".gradebook-course-title",
    items: {
        options: {
            name: "Course Options",
            callback: function (key, opt) {
                openModal("course-settings-modal", {
                    courseId: this[0].parentElement.id.match(/\d+/)[0],
                    courseName: this[0].querySelector("a span:nth-child(3)") ? this[0].querySelector("a span:nth-child(2)").textContent : this[0].innerText.split('\n')[0]
                });
            }
        },
        separator: "-----",
        materials: {
            name: "Materials",
            callback: function (key, opt) { window.open(`https://lms.lausd.net/course/${this[0].parentElement.id.match(/\d+/)[0]}/materials`, "_blank") }
        },
        updates: {
            name: "Updates",
            callback: function (key, opt) { window.open(`https://lms.lausd.net/course/${this[0].parentElement.id.match(/\d+/)[0]}/updates`, "_blank") }
        },
        student_grades: {
            name: "Grades",
            callback: function (key, opt) { window.open(`https://lms.lausd.net/course/${this[0].parentElement.id.match(/\d+/)[0]}/student_grades`, "_blank") }
        },
        mastery: {
            name: "Mastery",
            callback: function (key, opt) { window.open(`https://lms.lausd.net/course/${this[0].parentElement.id.match(/\d+/)[0]}/mastery`, "_blank") }
        },
        members: {
            name: "Members",
            callback: function (key, opt) { window.open(`https://lms.lausd.net/course/${this[0].parentElement.id.match(/\d+/)[0]}/members`, "_blank") }
        }
    }
});

var fetchQueue = [];
(async function () {
    console.log("Running Schoology Plus grades page improvement script");

    let inner = document.getElementById("main-inner") || document.getElementById("content-wrapper");
    let courses = inner.getElementsByClassName("gradebook-course");
    let coursesByPeriod = [];
    let gradesModified = false;

    let upperPeriodSortBound = 20;

    let courseLoadTasks = [];

    for (let course of courses) {
        courseLoadTasks.push((async function () {
            let title = course.querySelector(".gradebook-course-title");
            let summary = course.querySelector(".summary-course");
            let courseGrade;
            if (summary) {
                courseGrade = summary.querySelector(".awarded-grade");
            }
            let table = course.querySelector(".gradebook-course-grades").firstElementChild;
            let grades = table.firstElementChild;
            let categories = grades.getElementsByClassName("category-row");
            let rows = Array.from(grades.children);
            let periods = course.getElementsByClassName("period-row");
            let courseId = title.parentElement.id.match(/\d+/)[0];

            let classPoints = 0;
            let classTotal = 0;
            let addMoreClassTotal = true;

            // if there's no PERIOD \d string in the course name, match will return null; in that case, use the array [null, i++]
            // OR is lazy, so the ++ won't trigger unnecessarily; upperPeriodSortBound is our array key, and we use it to give a unique index (after all course) to periodless courses
            coursesByPeriod[Number.parseInt((title.textContent.match(/PERIOD (\d+)/) || [null, upperPeriodSortBound++])[1])] = course;

            // Fix width of assignment columns
            table.appendChild(createElement("colgroup", [], {}, [
                createElement("col", ["assignment-column"]),
                createElement("col", ["points-column"]),
                createElement("col", ["comments-column"])
            ]));

            let grade = createElement("span", ["awarded-grade", "injected-title-grade", courseGrade ? "grade-active-color" : "grade-none-color"], { textContent: "LOADING" });
            title.appendChild(grade);

            for (let category of categories) {
                let assignments = rows.filter(x => category.dataset.id == x.dataset.parentId);
                let sum = 0;
                let max = 0;
                let processAssignment = async function (assignment) {
                    let maxGrade = assignment.querySelector(".max-grade");
                    let score = assignment.querySelector(".rounded-grade") || assignment.querySelector(".rubric-grade-value");
                    if (score) {
                        let assignmentScore = Number.parseFloat(score.textContent);
                        let assignmentMax = Number.parseFloat(maxGrade.textContent.substring(3));

                        if (!assignment.classList.contains("dropped")) {
                            sum += assignmentScore;
                            max += assignmentMax;
                        }

                        let newGrade = document.createElement("span");
                        prepareScoredAssignmentGrade(newGrade, assignmentScore, assignmentMax);

                        // td-content-wrapper
                        maxGrade.parentElement.appendChild(document.createElement("br"));
                        maxGrade.parentElement.appendChild(newGrade);
                    }
                    else {
                        queueNonenteredAssignment(assignment, courseId);
                    }
                    if (assignment.querySelector(".missing")) {
                        // get denominator for missing assignment
                        let p = assignment.querySelector(".injected-assignment-percent");
                        p.textContent = "0%";
                        p.title = "Assignment missing";
                        console.log(`Fetching max points for assignment ${assignment.dataset.id.substr(2)}`);
                        let json = await fetchApiJson(`/sections/${courseId}/assignments/${assignment.dataset.id.substr(2)}`);

                        let pts = Number.parseFloat(json.max_points);
                        if (!assignment.classList.contains("dropped")) {
                            max += pts;
                            console.log(`Max points for assignment ${assignment.dataset.id.substr(2)} is ${pts}`);
                        }
                    }
                    //assignment.style.padding = "7px 30px 5px";
                    //assignment.style.textAlign = "center";

                    // kabob menu
                    let commentsContentWrapper = assignment.querySelector(".comment-column").firstElementChild;
                    let kabobMenuButton = createElement("span", ["kabob-menu"], {
                        textContent: "⠇",
                        onclick: function (event) {
                            $(assignment).contextMenu({ x: event.pageX, y: event.pageY });
                        }
                    });

                    let editEnableCheckbox = document.getElementById("enable-modify");

                    // not created yet and thus editing disabled, or created the toggle but editing disabled
                    if (!editEnableCheckbox || !editEnableCheckbox.checked) {
                        kabobMenuButton.classList.add("hidden");
                    }

                    commentsContentWrapper.insertAdjacentElement("beforeend", kabobMenuButton);
                    if (commentsContentWrapper.querySelector(".comment")) {
                        commentsContentWrapper.style.display = "flex";
                    }

                    let createAddAssignmentUi = async function () {
                        //.insertAdjacentElement('afterend', document.createElement("div"))
                        let addAssignmentThing = createElement("tr", ["report-row", "item-row", "last-row-of-tier", "grade-add-indicator"]);
                        addAssignmentThing.dataset.parentId = category.dataset.id;
                        // to avoid a hugely annoying DOM construction
                        // edit indicator will be added later
                        // FIXME add little plus icon
                        addAssignmentThing.innerHTML = '<th scope="row" class="title-column clickable"><div class="reportSpacer-3"><div class="td-content-wrapper"><span class="title"><a class="sExtlink-processed">Add Assignment</a></span></div></div></th><td class="grade-column"><div class="td-content-wrapper"><span class="no-grade">—</span><div class="grade-wrapper"></div></div></td><td class="comment-column"><div class="td-content-wrapper"><span class="visually-hidden">No comment</span></div></td>';
                        addAssignmentThing.getElementsByClassName("title")[0].firstElementChild.addEventListener("click", function () {
                            addAssignmentThing.querySelector("img.grade-edit-indicator").click();
                        });

                        if (assignment.classList.contains("hidden")) {
                            addAssignmentThing.classList.add("hidden");
                        }

                        assignment.insertAdjacentElement('afterend', addAssignmentThing);
                        await processAssignment(addAssignmentThing);

                        return addAssignmentThing;
                    };

                    // add UI for grade virtual editing
                    let gradeWrapper = assignment.querySelector(".grade-wrapper");
                    // FIXME correct behavior for editing dropped assignments
                    // excused assignments cannot be edited and do not count toward grade
                    if (!assignment.querySelector(".excused")) {
                        let checkbox = document.getElementById("enable-modify");
                        let editGradeImg = createElement("img", ["grade-edit-indicator"], {
                            src: chrome.runtime.getURL("imgs/edit-pencil.svg"),
                            width: 12,
                            style: `display: ${checkbox && checkbox.checked ? "unset" : "none"};`
                        });
                        let gradeAddEditHandler = null;
                        if (assignment.classList.contains("grade-add-indicator")) {
                            // when this is clicked, if the edit was successful, we don't have to worry about making our changes reversible cleanly
                            // the reversal takes the form of a page refresh once grades have been changed
                            let hasHandledGradeEdit = false;
                            gradeAddEditHandler = async function () {
                                if (hasHandledGradeEdit) {
                                    return;
                                }

                                assignment.classList.remove("grade-add-indicator");
                                assignment.classList.remove("last-row-of-tier");

                                assignment.classList.add("added-fake-assignment");

                                assignment.getElementsByClassName("title")[0].firstElementChild.textContent = "Added Assignment";

                                let newAddAssignmentPlaceholder = await createAddAssignmentUi();
                                newAddAssignmentPlaceholder.style.display = "table-row";

                                hasHandledGradeEdit = true;
                            };
                        }
                        editGradeImg.addEventListener("click", createEditListener(assignment, gradeWrapper.parentElement, category, periods[0], gradeAddEditHandler));
                        gradeWrapper.appendChild(editGradeImg);
                    }
                    if (assignment.classList.contains("last-row-of-tier") && !assignment.classList.contains("grade-add-indicator")) {
                        await createAddAssignmentUi();
                    }
                };

                for (let assignment of assignments) {
                    await processAssignment(assignment);
                }

                if (assignments.length === 0) {
                    category.querySelector(".grade-column").classList.add("grade-column-center");
                }

                let gradeText = category.querySelector(".awarded-grade") || category.querySelector(".no-grade");
                if (gradeText) {
                    setGradeText(gradeText, sum, max, category);
                    gradeText.classList.remove("no-grade");
                    gradeText.classList.add("awarded-grade");
                }

                let weightText = category.querySelector(".percentage-contrib");
                if (addMoreClassTotal) {
                    if (!weightText) {
                        classPoints += sum;
                        classTotal += max;
                    } else if (weightText.textContent == "(100%)") {
                        classPoints = sum;
                        classTotal = max;
                        addMoreClassTotal = false;
                    } else {
                        // there are weighted categories that aren't 100%, abandon our calculation
                        classPoints = 0;
                        classTotal = 0;
                        addMoreClassTotal = false;
                    }
                }
            }

            grade.textContent = courseGrade ? courseGrade.textContent : "—";

            addLetterGrade(grade, courseId);

            let gradeText = periods[0].querySelector(".awarded-grade");
            setGradeText(gradeText, classPoints, classTotal, periods[0], classTotal === 0);
            for (let i = 1; i < periods.length; i++) {
                periods[i].remove();
            }
        })());
    }

    if (!document.location.search.includes("past") || document.location.search.split("past=")[1] != 1) {
        if (storage["orderClasses"] == "period") {
            for (let course of coursesByPeriod) {
                if (course) {
                    course.parentElement.appendChild(course);
                }
            }
        }

        let timeRow = document.getElementById("past-selector") || document.querySelector(".content-top-upper").insertAdjacentElement('afterend', document.createElement("div"));

        timeRow.appendChild(createElement("label", ["modify-label"], {
            textContent: "Enable grade modification",
            htmlFor: "enable-modify"
        }));

        timeRow.appendChild(createElement("input", [], {
            type: "checkbox",
            id: "enable-modify",
            onclick: function () {
                let normalAssignRClickSelector = ".item-row:not(.dropped):not(.grade-add-indicator):not(.added-fake-assignment):not(.contains-exception)";
                let addedAssignRClickSelector = ".item-row.added-fake-assignment:not(.dropped):not(.grade-add-indicator):not(.contains-exception)";
                let droppedAssignRClickSelector = ".item-row.dropped:not(.grade-add-indicator):not(.contains-exception)";

                if (document.getElementById("enable-modify").checked) {
                    for (let edit of document.getElementsByClassName("grade-edit-indicator")) {
                        edit.style.display = "unset";
                    }
                    for (let edit of document.getElementsByClassName("grade-add-indicator")) {
                        edit.style.display = "table-row";
                        if (edit.previousElementSibling.classList.contains("item-row") && edit.previousElementSibling.classList.contains("last-row-of-tier")) {
                            edit.previousElementSibling.classList.remove("last-row-of-tier");
                        }
                    }

                    let calculateMinimumGrade = function (element, desiredGrade) {
                        let gradeColContentWrap = element.querySelector(".grade-wrapper").parentElement;
                        // TODO refactor the grade extraction
                        let noGrade = gradeColContentWrap.querySelector(".no-grade");
                        let score = gradeColContentWrap.querySelector(".rounded-grade") || gradeColContentWrap.querySelector(".rubric-grade-value") || gradeColContentWrap.querySelector(".no-grade");
                        let maxGrade = gradeColContentWrap.querySelector(".max-grade");
                        let scoreVal = 0;
                        let maxVal = 0;
                        noGrade = noGrade == score;

                        if (score && maxGrade) {
                            scoreVal = Number.parseFloat(score.textContent);
                            maxVal = Number.parseFloat(maxGrade.textContent.substring(3));
                        } else if (element.querySelector(".exception-icon.missing")) {
                            let scoreValues = maxGrade.textContent.split("/");
                            scoreVal = Number.parseFloat(scoreValues[0]);
                            maxVal = Number.parseFloat(scoreValues[1]);
                        }

                        if (Number.isNaN(scoreVal)) {
                            scoreVal = 0;
                            score.classList.add("rounded-grade");
                            score.classList.remove("no-grade");
                        }

                        if (!gradeColContentWrap.querySelector(".modified-score-percent-warning")) {
                            //gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0].style.paddingRight = "0";
                            gradeColContentWrap.appendChild(generateScoreModifyWarning());
                            gradesModified = true;
                        }

                        let catId = element.dataset.parentId;
                        let catRow = Array.prototype.find.call(element.parentElement.getElementsByTagName("tr"), e => e.dataset.id == catId);

                        let perId = catRow.dataset.parentId;
                        let perRow = Array.prototype.find.call(element.parentElement.getElementsByTagName("tr"), e => e.dataset.id == perId);

                        let deltaScore = 0;

                        // TODO refactor
                        // if the period (course) has a point value (unweighted), just work from there
                        let awardedPeriodPoints = perRow.querySelector(".grade-column-center");
                        if (awardedPeriodPoints && awardedPeriodPoints.textContent.trim().length !== 0) {
                            // awarded grade in our constructed element contains both rounded and max
                            let perScoreElem = awardedPeriodPoints.querySelector(".rounded-grade");
                            let perMaxElem = awardedPeriodPoints.querySelector(".max-grade");
                            let perScore = Number.parseFloat(perScoreElem.textContent);
                            let perMax = Number.parseFloat(perMaxElem.textContent.substring(3));

                            if (noGrade) {
                                perMax += maxVal;
                            }

                            // (perScore + x) / perMax = desiredGrade
                            // solve for x:
                            deltaScore = (desiredGrade * perMax) - perScore;
                        } else {
                            // weighted
                            // get category score and category weight
                            let awardedCategoryPoints = catRow.querySelector(".rounded-grade").parentNode;
                            let catScoreElem = awardedCategoryPoints.querySelector(".rounded-grade");
                            let catMaxElem = awardedCategoryPoints.querySelector(".max-grade");
                            let catScore = Number.parseFloat(catScoreElem.textContent);
                            let catMax = Number.parseFloat(catMaxElem.textContent.substring(3));

                            if (noGrade) {
                                catMax += maxVal;
                            }

                            // TODO refactor
                            let total = 0;
                            let totalPercentWeight = 0;
                            let catWeight = 0; // 0 to 1
                            for (let category of perRow.parentElement.getElementsByClassName("category-row")) {
                                let weightPercentElement = category.getElementsByClassName("percentage-contrib")[0];
                                if (!weightPercentElement) {
                                    continue;
                                }

                                let weightPercent = weightPercentElement.textContent;
                                let col = category.getElementsByClassName("grade-column-right")[0];

                                let colMatch = col ? col.textContent.match(/(\d+\.?\d*)%/) : null;

                                if (colMatch) {
                                    let scorePercent = Number.parseFloat(colMatch[1]);
                                    if (scorePercent && !Number.isNaN(scorePercent)) {
                                        total += (weightPercent.slice(1, -2) / 100) * scorePercent;
                                        let weight = Number.parseFloat(weightPercent.slice(1, -2));
                                        totalPercentWeight += weight;
                                        if (category.dataset.id == catId) {
                                            catWeight = weight / 100;
                                        }
                                    }
                                }
                            }

                            totalPercentWeight /= 100;

                            // if only some categories have assignments, adjust the total accordingly 
                            // if weights are more than 100, this assumes that it's correct as intended (e.c.), I won't mess with it
                            if (totalPercentWeight > 0 && totalPercentWeight < 1) {
                                // some categories are specified, but weights don't quite add to 100
                                // scale up known grades
                                total /= totalPercentWeight;
                                catWeight /= totalPercentWeight;
                                // epsilon because floating point
                            } else if (totalPercentWeight < 0.00001) {
                                total = 100;
                            }

                            // normalize total: 0 to 1+ [e.c.], total course score
                            total /= 100;

                            // calculate the worth in percentage points of one point in our category
                            let catPointWorth = catWeight / catMax;

                            // total + (catPointWorth*deltaScore) = desiredGrade
                            // solve:
                            deltaScore = (desiredGrade - total) / catPointWorth;
                        }

                        if (deltaScore < 0) {
                            deltaScore = 0;
                        } else {
                            deltaScore = Math.round(deltaScore * 100) / 100;
                        }

                        // TODO refactor: we already have our DOM elements
                        if (score) {
                            score.title = scoreVal + deltaScore;
                            score.textContent = scoreVal + deltaScore;
                        }

                        prepareScoredAssignmentGrade(element.querySelector(".injected-assignment-percent"), scoreVal + deltaScore, maxVal);
                        recalculateCategoryScore(catRow, deltaScore, noGrade ? maxVal : 0);
                        recalculatePeriodScore(perRow, deltaScore, noGrade ? maxVal : 0);
                    };

                    let dropGradeThis = function () {
                        this[0].classList.add("dropped");
                        // alter grade
                        let gradeColContentWrap = this[0].querySelector(".grade-wrapper").parentElement;
                        // TODO refactor the grade extraction
                        let score = gradeColContentWrap.querySelector(".rounded-grade") || gradeColContentWrap.querySelector(".rubric-grade-value");
                        let maxGrade = gradeColContentWrap.querySelector(".max-grade");
                        let scoreVal = 0;
                        let maxVal = 0;

                        if (score && maxGrade) {
                            scoreVal = Number.parseFloat(score.textContent);
                            maxVal = Number.parseFloat(maxGrade.textContent.substring(3));
                        } else if (this[0].querySelector(".exception-icon.missing")) {
                            let scoreValues = maxGrade.textContent.split("/");
                            scoreVal = Number.parseFloat(scoreValues[0]);
                            maxVal = Number.parseFloat(scoreValues[1]);
                        }

                        if (!gradeColContentWrap.querySelector(".modified-score-percent-warning")) {
                            //gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0].style.paddingRight = "0";
                            gradeColContentWrap.appendChild(generateScoreModifyWarning());
                            gradesModified = true;
                        }

                        let catId = this[0].dataset.parentId;
                        let catRow = Array.prototype.find.call(this[0].parentElement.getElementsByTagName("tr"), e => e.dataset.id == catId);
                        recalculateCategoryScore(catRow, -scoreVal, -maxVal);

                        let perId = catRow.dataset.parentId;
                        let perRow = Array.prototype.find.call(this[0].parentElement.getElementsByTagName("tr"), e => e.dataset.id == perId);
                        recalculatePeriodScore(perRow, -scoreVal, -maxVal);
                    };

                    let undroppedAssignItemSet = {
                        drop: {
                            name: "Drop",
                            callback: dropGradeThis
                        },
                        delete: {
                            name: "Delete",
                            callback: function () {
                                dropGradeThis.bind(this)();
                                // shouldn't need to worry about any last-row-of-tier stuff because this will always be followed by an Add Assignment indicator
                                this[0].remove();
                            }
                        },
                        separator: "-----",
                        calculateMinGrade: {
                            name: "Calculate Minimum Grade",
                            callback: function (key, opt) {
                                // TODO refactor grade extraction
                                // get course letter grade
                                let catId = this[0].dataset.parentId;
                                let catRow = Array.prototype.find.call(this[0].parentElement.getElementsByTagName("tr"), e => e.dataset.id == catId);
                                let perId = catRow.dataset.parentId;
                                let perRow = Array.prototype.find.call(this[0].parentElement.getElementsByTagName("tr"), e => e.dataset.id == perId);

                                // TODO refactor
                                // (this) tr -> tbody -> table -> div.gradebook-course-grades -> relevant div
                                let courseId = Number.parseInt(/course-(\d+)$/.exec(this[0].parentElement.parentElement.parentElement.parentElement.id)[1]);

                                let gradingScale = storage.getGradingScale(courseId);

                                let courseGrade = getLetterGrade(gradingScale, Number.parseFloat(/\d+(\.\d+)%/.exec(perRow.querySelector(".grade-column-right").firstElementChild.textContent)[0].slice(0, -1)));

                                let desiredPercentage = 0.9;

                                // letter to percent - "in" for property enumeration
                                for (let gradeValue in gradingScale) {
                                    if (gradingScale[gradeValue] == courseGrade) {
                                        desiredPercentage = Number.parseFloat(gradeValue) / 100;
                                        break;
                                    }
                                }

                                calculateMinimumGrade(this[0], desiredPercentage);
                            },
                            items: {}
                        }
                    };

                    let undroppedAssignContextMenuItems = {
                        drop: undroppedAssignItemSet.drop,
                        separator: undroppedAssignItemSet.separator,
                        calculateMinGrade: undroppedAssignItemSet.calculateMinGrade
                    };

                    for (let courseElement of document.getElementsByClassName("gradebook-course")) {
                        let baseContextMenuObject = {};
                        let calcMinFor = {};
                        baseContextMenuObject.items = {};
                        Object.assign(baseContextMenuObject.items, undroppedAssignContextMenuItems);
                        baseContextMenuObject.items.calculateMinGrade = {};
                        Object.assign(baseContextMenuObject.items.calculateMinGrade, undroppedAssignContextMenuItems.calculateMinGrade);
                        baseContextMenuObject.items.calculateMinGrade.items = calcMinFor;

                        baseContextMenuObject.selector = "#" + courseElement.id + " ";

                        let courseId = /\d+$/.exec(courseElement.id)[0];

                        // TODO if grade scale is updated while this page is loaded (i.e. after this code runs) what to do
                        let gradingScale = storage.getGradingScale(courseId);

                        for (let gradeValue of Object.keys(gradingScale).sort((a, b) => b - a)) {
                            let letterGrade = gradingScale[gradeValue];
                            calcMinFor["calculateMinGradeFor" + gradeValue] = {
                                name: "For " + letterGrade,
                                callback: function (key, opt) {
                                    calculateMinimumGrade(this[0], Number.parseFloat(gradeValue) / 100);
                                }
                            };
                        }

                        let normalContextMenuObject = Object.assign({}, baseContextMenuObject);
                        normalContextMenuObject.selector += normalAssignRClickSelector;


                        let addedContextMenuObject = Object.assign({}, baseContextMenuObject);
                        addedContextMenuObject.selector += addedAssignRClickSelector;
                        // replace drop with delete
                        addedContextMenuObject.items = Object.assign({}, baseContextMenuObject.items);
                        addedContextMenuObject.items.drop = undroppedAssignItemSet.delete;

                        $.contextMenu(normalContextMenuObject);
                        $.contextMenu(addedContextMenuObject);
                    }

                    $.contextMenu({
                        selector: droppedAssignRClickSelector,
                        items: {
                            undrop: {
                                name: "Undrop",
                                callback: function (key, opt) {
                                    this[0].classList.remove("dropped");
                                    // alter grade
                                    let gradeColContentWrap = this[0].querySelector(".grade-wrapper").parentElement;
                                    // TODO refactor the grade extraction
                                    let score = gradeColContentWrap.querySelector(".rounded-grade") || gradeColContentWrap.querySelector(".rubric-grade-value");
                                    let maxGrade = gradeColContentWrap.querySelector(".max-grade");
                                    let scoreVal = 0;
                                    let maxVal = 0;

                                    if (score && maxGrade) {
                                        scoreVal = Number.parseFloat(score.textContent);
                                        maxVal = Number.parseFloat(maxGrade.textContent.substring(3));
                                    } else if (this[0].querySelector(".exception-icon.missing")) {
                                        let scoreValues = maxGrade.textContent.split("/");
                                        scoreVal = Number.parseFloat(scoreValues[0]);
                                        maxVal = Number.parseFloat(scoreValues[1]);
                                    }

                                    if (!gradeColContentWrap.querySelector(".modified-score-percent-warning")) {
                                        //gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0].style.paddingRight = "0";
                                        gradeColContentWrap.appendChild(generateScoreModifyWarning());
                                        gradesModified = true;
                                    }

                                    let catId = this[0].dataset.parentId;
                                    let catRow = Array.prototype.find.call(this[0].parentElement.getElementsByTagName("tr"), e => e.dataset.id == catId);
                                    recalculateCategoryScore(catRow, scoreVal, maxVal);

                                    let perId = catRow.dataset.parentId;
                                    let perRow = Array.prototype.find.call(this[0].parentElement.getElementsByTagName("tr"), e => e.dataset.id == perId);
                                    recalculatePeriodScore(perRow, scoreVal, maxVal);
                                }
                            }
                        }
                    });

                    for (let kabob of document.getElementsByClassName("kabob-menu")) {
                        kabob.classList.remove("hidden");
                    }
                } else if (!gradesModified) {
                    for (let edit of document.getElementsByClassName("grade-edit-indicator")) {
                        edit.style.display = "none";
                    }
                    for (let edit of document.getElementsByClassName("grade-add-indicator")) {
                        edit.style.display = "none";
                        if (edit.previousElementSibling.classList.contains("item-row") && !edit.previousElementSibling.classList.contains("last-row-of-tier")) {
                            edit.previousElementSibling.classList.add("last-row-of-tier");
                        }
                    }
                    for (let kabob of document.getElementsByClassName("kabob-menu")) {
                        kabob.classList.add("hidden");
                    }
                    for (let courseElement of document.getElementsByClassName("gradebook-course")) {
                        $.contextMenu("destroy", "#" + courseElement.id + " " + normalAssignRClickSelector);
                        $.contextMenu("destroy", "#" + courseElement.id + " " + addedAssignRClickSelector);
                    }
                    $.contextMenu("destroy", droppedAssignRClickSelector);
                } else {
                    // not going to try to undo any grade modifications
                    document.location.reload();
                }
            }
        }));
    }

    for (let courseTask of courseLoadTasks) {
        await courseTask;
    }

    function getLetterGrade(gradingScale, percentage) {
        let sorted = Object.keys(gradingScale).sort((a, b) => b - a);
        for (let s of sorted) {
            if (percentage >= Number.parseInt(s)) {
                return gradingScale[s];
            }
        }
        return "?";
    }

    function queueNonenteredAssignment(assignment, courseId) {
        let noGrade = assignment.getElementsByClassName("no-grade")[0];

        if (noGrade.parentElement.classList.contains("exception-grade-wrapper")) {
            noGrade.remove();
            assignment.classList.add("contains-exception")
            // an exception case
            // now we just have to be careful to avoid double-counting
            noGrade = assignment.querySelector(".exception .exception-icon");
            if (noGrade) {
                // the text gets in the way
                let exceptionDesc = assignment.querySelector(".exception .exception-text");
                noGrade.title = exceptionDesc.textContent;
                exceptionDesc.remove();
            }
        }

        if (noGrade && assignment.dataset.id) {
            // do this while the other operation is happening so we don't block the page load
            // don't block on it

            let maxGrade = document.createElement("span");
            maxGrade.classList.add("max-grade");
            maxGrade.classList.add("no-grade");
            maxGrade.textContent = " / —";
            noGrade.insertAdjacentElement("afterend", maxGrade);

            let f = async () => {
                console.log(`Fetching max points for (nonentered) assignment ${assignment.dataset.id.substr(2)}`);
                let response = await fetchApi(`/sections/${courseId}/assignments/${assignment.dataset.id.substr(2)}`);
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                let json = await response.json();

                if (json && json.max_points !== null && json.max_points !== undefined) {
                    // success case
                    // note; even if maxGrade is removed from the DOM, this will still work
                    maxGrade.textContent = " / " + json.max_points;
                    maxGrade.classList.remove("no-grade");
                }
            };
            fetchQueue.push(f);
        }

        // td-content-wrapper
        noGrade.parentElement.appendChild(document.createElement("br"));
        let injectedPercent = createElement("span", ["percentage-grade", "injected-assignment-percent"], { textContent: "N/A" });
        noGrade.parentElement.appendChild(injectedPercent);
    }

    function prepareScoredAssignmentGrade(spanPercent, score, max) {
        spanPercent.textContent = max === 0 ? "EC" : `${Math.round(score * 100 / max)}%`;
        spanPercent.title = max === 0 ? "Extra Credit" : `${score * 100 / max}%`;
        if (!spanPercent.classList.contains("max-grade")) {
            spanPercent.classList.add("max-grade");
        }
        if (!spanPercent.classList.contains("injected-assignment-percent")) {
            spanPercent.classList.add("injected-assignment-percent");
        }
    }

    function setGradeText(gradeElement, sum, max, row, doNotDisplay) {
        if (gradeElement) {
            let courseId = row.parentElement.firstElementChild.dataset.id;
            // currently there exists a letter grade here, we want to put a point score here and move the letter grade
            let text = gradeElement.parentElement.textContent;
            let textContent = gradeElement.parentElement.textContent;
            gradeElement.parentElement.classList.add("grade-column-center");
            //gradeElement.parentElement.style.textAlign = "center";
            //gradeElement.parentElement.style.paddingRight = "30px";
            gradeElement.innerHTML = "";
            // create the elements for our point score
            gradeElement.appendChild(createElement("span", ["rounded-grade"], { textContent: doNotDisplay ? "" : Math.round(sum * 100) / 100 }));
            gradeElement.appendChild(createElement("span", ["max-grade"], { textContent: doNotDisplay ? "" : ` / ${Math.round(max * 100) / 100}` }));
            // move the letter grade over to the right
            span = row.querySelector(".comment-column").firstChild;
            span.textContent = text;

            addLetterGrade(span, courseId);

            // restyle the right hand side
            span.parentElement.classList.remove("comment-column");
            span.parentElement.classList.add("grade-column");
            span.parentElement.classList.add("grade-column-right");
            //span.style.cssFloat = "right"; //maybe remove
            //span.style.color = "#3aa406";
            //span.style.fontWeight = "bold";
        }
    }

    function addLetterGrade(elem, courseId) {
        let gradingScale = storage.getGradingScale(courseId);
        if (storage["customScales"] != "disabled" && elem.textContent.match(/^\d+\.?\d*%/) !== null) {
            let percent = Number.parseFloat(elem.textContent.substr(0, elem.textContent.length - 1));
            let letterGrade = getLetterGrade(gradingScale, percent);
            elem.textContent = `${letterGrade} (${percent}%)`;
            elem.title = `Letter grade calculated using the following grading scale:\n${Object.keys(gradingScale).sort((a, b) => a - b).reverse().map(x => `${gradingScale[x]}: ${x}%`).join('\n')}`;
        }
    }

    function generateScoreModifyWarning() {
        return createElement("img", ["modified-score-percent-warning"], {
            src: chrome.runtime.getURL("imgs/exclamation-mark.svg"),
            title: "This grade has been modified from its true value."
        });
    }

    function recalculateCategoryScore(catRow, deltaPoints, deltaMax) {
        // category always has a numeric score, unlike period
        // awarded grade in our constructed element contains both rounded and max
        let awardedCategoryPoints = catRow.querySelector(".rounded-grade").parentNode;
        let catScoreElem = awardedCategoryPoints.querySelector(".rounded-grade");
        let catMaxElem = awardedCategoryPoints.querySelector(".max-grade");
        let newCatScore = Number.parseFloat(catScoreElem.textContent) + deltaPoints;
        let newCatMax = Number.parseFloat(catMaxElem.textContent.substring(3)) + deltaMax;
        catScoreElem.textContent = newCatScore;
        catMaxElem.textContent = " / " + newCatMax;
        if (!awardedCategoryPoints.querySelector(".modified-score-percent-warning")) {
            awardedCategoryPoints.appendChild(generateScoreModifyWarning());
        }
        // category percentage
        // need to recalculate
        // content wrapper in right grade col
        let awardedCategoryPercentContainer = catRow.querySelector(".grade-column-right").firstElementChild;
        let awardedCategoryPercent = awardedCategoryPercentContainer;
        // clear existing percentage indicator
        while (awardedCategoryPercent.firstChild) {
            awardedCategoryPercent.firstChild.remove();
        }
        awardedCategoryPercent.appendChild(document.createElement("span"));
        awardedCategoryPercent = awardedCategoryPercent.firstElementChild;
        awardedCategoryPercent.classList.add("awarded-grade");
        awardedCategoryPercent.appendChild(document.createElement("span"));
        awardedCategoryPercent = awardedCategoryPercent.firstElementChild;
        awardedCategoryPercent.classList.add("numeric-grade");
        awardedCategoryPercent.classList.add("primary-grade");
        awardedCategoryPercent.appendChild(document.createElement("span"));
        awardedCategoryPercent = awardedCategoryPercent.firstElementChild;
        awardedCategoryPercent.classList.add("rounded-grade");

        let newCatPercent = (newCatScore / newCatMax) * 100;
        awardedCategoryPercent.title = newCatPercent + "%";
        awardedCategoryPercent.textContent = (Math.round(newCatPercent * 100) / 100) + "%";

        if (!awardedCategoryPercentContainer.querySelector(".modified-score-percent-warning")) {
            awardedCategoryPercentContainer.prepend(generateScoreModifyWarning());
        }
    }

    function recalculatePeriodScore(perRow, deltaPoints, deltaMax) {
        let awardedPeriodPercentContainer = perRow.querySelector(".grade-column-right").firstElementChild;
        let awardedPeriodPercent = awardedPeriodPercentContainer;
        // clear existing percentage indicator
        while (awardedPeriodPercent.firstChild) {
            awardedPeriodPercent.firstChild.remove();
        }
        awardedPeriodPercent.appendChild(document.createElement("span"));
        awardedPeriodPercent = awardedPeriodPercent.firstElementChild;
        awardedPeriodPercent.classList.add("awarded-grade");
        awardedPeriodPercent.appendChild(document.createElement("span"));
        awardedPeriodPercent = awardedPeriodPercent.firstElementChild;
        awardedPeriodPercent.classList.add("numeric-grade");
        awardedPeriodPercent.classList.add("primary-grade");
        awardedPeriodPercent.appendChild(document.createElement("span"));
        awardedPeriodPercent = awardedPeriodPercent.firstElementChild;
        awardedPeriodPercent.classList.add("rounded-grade");

        // now period (semester)
        // might have a numeric score (weighting => no numeric, meaning we can assume unweighted if present)
        let awardedPeriodPoints = perRow.querySelector(".grade-column-center");
        if (awardedPeriodPoints && awardedPeriodPoints.textContent.trim().length !== 0) {
            // awarded grade in our constructed element contains both rounded and max
            let perScoreElem = awardedPeriodPoints.querySelector(".rounded-grade");
            let perMaxElem = awardedPeriodPoints.querySelector(".max-grade");
            let newPerScore = Number.parseFloat(perScoreElem.textContent) + deltaPoints;
            let newPerMax = Number.parseFloat(perMaxElem.textContent.substring(3)) + deltaMax;
            perScoreElem.textContent = newPerScore;
            perMaxElem.textContent = " / " + newPerMax;
            if (!awardedPeriodPoints.querySelector(".modified-score-percent-warning")) {
                awardedPeriodPoints.appendChild(generateScoreModifyWarning());
            }

            // go ahead and calculate period percentage here since we know it's unweighted
            let newPerPercent = (newPerScore / newPerMax) * 100;
            awardedPeriodPercent.title = newPerPercent + "%";
            awardedPeriodPercent.textContent = (Math.round(newPerPercent * 100) / 100) + "%";
        } else {
            let total = 0;
            let totalPercentWeight = 0;
            for (let category of perRow.parentElement.getElementsByClassName("category-row")) {
                let weightPercentElement = category.getElementsByClassName("percentage-contrib")[0];
                if (!weightPercentElement) {
                    continue;
                }
                let weightPercent = weightPercentElement.textContent;
                let col = category.getElementsByClassName("grade-column-right")[0];
                let colMatch = col ? col.textContent.match(/(\d+\.?\d*)%/) : null;
                if (colMatch) {
                    let scorePercent = Number.parseFloat(colMatch[1]);
                    if (scorePercent && !Number.isNaN(scorePercent)) {
                        total += (weightPercent.slice(1, -2) / 100) * scorePercent;
                        totalPercentWeight += Number.parseFloat(weightPercent.slice(1, -2));
                    }
                }
            }

            totalPercentWeight /= 100;

            // if only some categories have assignments, adjust the total accordingly 
            // if weights are more than 100, this assumes that it's correct as intended (e.c.), I won't mess with it
            if (totalPercentWeight > 0 && totalPercentWeight < 1) {
                // some categories are specified, but weights don't quite add to 100
                // scale up known grades
                total /= totalPercentWeight;
                // epsilon because floating point
            } else if (totalPercentWeight < 0.00001) {
                total = 100;
            }

            awardedPeriodPercent.title = total + "%";
            awardedPeriodPercent.textContent = (Math.round(total * 100) / 100) + "%";
        }

        if (!awardedPeriodPercentContainer.querySelector(".modified-score-percent-warning")) {
            awardedPeriodPercentContainer.prepend(generateScoreModifyWarning());
        }
    }

    function createEditListener(assignment, gradeColContentWrap, catRow, perRow, finishedCallback) {
        return function () {
            let noGrade = gradeColContentWrap.querySelector(".no-grade");
            let score = gradeColContentWrap.querySelector(".rounded-grade") || gradeColContentWrap.querySelector(".rubric-grade-value");
            // note that this will always return (for our injected percentage element)
            let maxGrade = gradeColContentWrap.querySelector(".max-grade");
            let editElem;
            let initPts;
            let initMax;
            if (noGrade) {
                editElem = noGrade;
                initPts = 0;
                initMax = 0;
                if (maxGrade && maxGrade.classList.contains("no-grade")) {
                    maxGrade.remove();
                    maxGrade = null;
                }
            }
            if (score && maxGrade) {
                editElem = score;
                initPts = Number.parseFloat(score.textContent);
                initMax = Number.parseFloat(maxGrade.textContent.substring(3));
            }

            if (!editElem || editElem.classList.contains("student-editable")) {
                return;
            }

            editElem.classList.add("student-editable");
            editElem.contentEditable = true;

            // TODO blur v focusout
            let submitFunc = function () {
                if (!editElem.classList.contains("student-editable")) {
                    // we've already processed this event, ignore and return for cleanup
                    return true;
                }

                let userScore;
                let userMax;
                if (noGrade) {
                    // regex capture and check
                    if (maxGrade) {
                        userScore = Number.parseFloat(noGrade.textContent);
                        // noGrade+maxGrade = inserted maxGrade from an API call
                        // initDenom = 0; newDenom = whatever is in that textfield
                        userMax = Number.parseFloat(maxGrade.textContent.substring(3));
                    } else {
                        let regexResult = /^(-?\d+(\.\d+)?)\s*\/\s*(-?\d+(\.\d+)?)$/.exec(editElem.textContent);
                        if (!regexResult) {
                            return false;
                        }
                        userScore = Number.parseFloat(regexResult[1]);
                        userMax = Number.parseFloat(regexResult[3]);
                    }
                    if (Number.isNaN(userScore) || Number.isNaN(userMax)) {
                        return false;
                    }
                } else if (score) {
                    // user entered number must be a numeric
                    userScore = Number.parseFloat(score.textContent);
                    userMax = initMax;
                    if (Number.isNaN(userScore)) {
                        return false;
                    }
                } else {
                    // ???
                    console.warn("unexpected case of field type in editing grade");
                    return false;
                }

                // we've established a known new score and max, with an init score and max to compare to
                let deltaPoints = userScore - initPts;
                let deltaMax = userMax - initMax;
                // first, replace no grades
                if (noGrade) {
                    if (!maxGrade) {
                        maxGrade = createElement("span", ["max-grade"], { textContent: " / " + userMax });
                        gradeColContentWrap.prepend(maxGrade);
                    }
                    let awardedGrade = createElement("span", ["awarded-grade"]);
                    score = createElement("span", ["rounded-grade"], { title: userScore, textContent: userScore });
                    awardedGrade.appendChild(score);
                    gradeColContentWrap.prepend(score);
                    noGrade.remove();
                } else {
                    // we already have our DOM elements
                    score.title = userScore;
                    score.textContent = userScore;
                    // will not have changed but still
                    maxGrade.textContent = " / " + userMax;
                    score.contentEditable = false;
                    score.classList.remove("student-editable");

                    // if there's a letter grade, remove it - it might be inaccurate
                    if (score.parentElement && score.parentElement.parentElement && score.parentElement.parentElement.tagName.toUpperCase() === "SPAN" && score.parentElement.parentElement.classList.contains("awarded-grade") && /^[A-DF] /.test(score.parentElement.parentElement.textContent)) {
                        // note use of childNodes, it's not its own element
                        score.parentElement.parentElement.childNodes[0].remove();
                    }
                }
                // update the assignment percentage
                prepareScoredAssignmentGrade(gradeColContentWrap.querySelector(".injected-assignment-percent"), userScore, userMax);
                if (!gradeColContentWrap.querySelector(".modified-score-percent-warning")) {
                    //gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0].style.paddingRight = "0";
                    gradeColContentWrap.appendChild(generateScoreModifyWarning());
                    gradesModified = true;
                }

                // don't alter totals for dropped assignment
                if (assignment.classList.contains("dropped")) {
                    if (finishedCallback) {
                        finishedCallback();
                    }

                    return true;
                }

                recalculateCategoryScore(catRow, deltaPoints, deltaMax);
                recalculatePeriodScore(perRow, deltaPoints, deltaMax);

                if (finishedCallback) {
                    finishedCallback();
                }

                return true;
            };
            let cleanupFunc = function () {
                editElem.removeEventListener("blur", blurFunc);
                editElem.removeEventListener("keydown", keyFunc);
            };
            let keyFunc = function (event) {
                if (event.which == 13 || event.keyCode == 13) {
                    editElem.blur();
                    return false;
                }
                return true;
            };
            let blurFunc = function (event) {
                if (submitFunc()) {
                    cleanupFunc();
                    var sel = window.getSelection ? window.getSelection() : document.selection;
                    if (sel) {
                        if (sel.removeAllRanges) {
                            sel.removeAllRanges();
                        } else if (sel.empty) {
                            sel.empty();
                        }
                    }
                } else {
                    editElem.focus();
                }
                return false;
            }
            editElem.addEventListener("blur", blurFunc);
            editElem.addEventListener("keydown", keyFunc);
            editElem.focus();
            document.execCommand('selectAll', false, null);
        };
    }
})().then(() => {
    console.log("Retrieving (" + fetchQueue.length + ") nonentered assignments info...")
    processNonenteredAssignments();
}).catch(reason => {
    console.error("Error running grades page modification script: ", reason);
});

function processNonenteredAssignments(sleep) {
    if (fetchQueue.length > 0) {
        setTimeout(() => {
            fetchQueue[0]().then(x => {
                fetchQueue.splice(0, 1);
                processNonenteredAssignments();
            }).catch(err => {
                console.warn("Caught error: " + err);
                console.log("Waiting 3 seconds to avoid rate limit");
                processNonenteredAssignments(true);
            });
        }, sleep ? 3000 : 0);
    }
}