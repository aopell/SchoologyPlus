console.log("Running Schoology Plus grades page improvement script");
let inner = document.getElementById("main-inner") || document.getElementById("content-wrapper");
let courses = inner.getElementsByClassName("gradebook-course");
let coursesByPeriod = [];
let gradesModified = false;

for (let course of courses) {
    let title = course.querySelector(".gradebook-course-title");
    let summary = course.querySelector(".summary-course");
    let courseGrade = summary.querySelector(".awarded-grade");
    let table = course.querySelector(".gradebook-course-grades").firstElementChild;
    let grades = table.firstElementChild;
    let categories = grades.getElementsByClassName("category-row");
    let rows = Array.from(grades.children);
    let periods = course.getElementsByClassName("period-row");

    let classPoints = 0;
    let classTotal = 0;
    let addMoreClassTotal = true;

    coursesByPeriod[Number.parseInt(title.textContent.match(/PERIOD (\d)/)[1])] = course;

    // Fix width of assignment columns
    let colGroup = document.createElement("colgroup");
    let col = document.createElement("col");
    col.classList.add("assignment-column");
    colGroup.appendChild(col);
    col = document.createElement("col");
    col.classList.add("points-column");
    colGroup.appendChild(col);
    col = document.createElement("col");
    col.classList.add("comments-column");
    colGroup.appendChild(col);
    table.appendChild(colGroup);

    for (let category of categories) {
        let assignments = rows.filter(x => category.dataset.id == x.dataset.parentId);
        let sum = 0;
        let max = 0;
        let processAssignment = function (assignment) {
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
                processNonenteredAssignment(assignment);
            }
            //assignment.style.padding = "7px 30px 5px";
            //assignment.style.textAlign = "center";

            let createAddAssignmentUi = function () {
                //.insertAdjacentElement('afterend', document.createElement("div"))
                let addAssignmentThing = document.createElement("tr");
                addAssignmentThing.classList.add("report-row");
                addAssignmentThing.classList.add("item-row");
                addAssignmentThing.classList.add("last-row-of-tier");
                addAssignmentThing.classList.add("grade-add-indicator");
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
                processAssignment(addAssignmentThing);

                return addAssignmentThing;
            };

            // add UI for grade virtual editing
            let gradeWrapper = assignment.querySelector(".grade-wrapper");
            // FIXME correct behavior for editing dropped assignments
            if (!assignment.classList.contains("dropped")) {
                let editGradeImg = document.createElement("img");
                editGradeImg.src = "https://www.iconninja.com/files/727/965/72/edit-draw-pencile-write-icon.svg";
                editGradeImg.width = 12;
                editGradeImg.classList.add("grade-edit-indicator");
                let gradeAddEditHandler = null;
                if (assignment.classList.contains("grade-add-indicator")) {
                    // when this is clicked, if the edit was successful, we don't have to worry about making our changes reversible cleanly
                    // the reversal takes the form of a page refresh once grades have been changed
                    let hasHandledGradeEdit = false;
                    gradeAddEditHandler = function () {
                        if (hasHandledGradeEdit) {
                            return;
                        }

                        assignment.classList.remove("grade-add-indicator");
                        assignment.classList.remove("last-row-of-tier");

                        assignment.getElementsByClassName("title")[0].firstElementChild.textContent = "Added Assignment";

                        let newAddAssignmentPlaceholder = createAddAssignmentUi();
                        newAddAssignmentPlaceholder.style.display = "table-row";

                        hasHandledGradeEdit = true;
                    };
                }
                editGradeImg.addEventListener("click", createEditListener(gradeWrapper.parentElement, category, periods[0], gradeAddEditHandler));
                gradeWrapper.appendChild(editGradeImg);
            }
            if (assignment.classList.contains("last-row-of-tier") && !assignment.classList.contains("grade-add-indicator")) {
                createAddAssignmentUi();
            }
        };

        for (let assignment of assignments) {
            processAssignment(assignment);
        }

        if (assignments.length === 0) {
            category.querySelector(".grade-column").classList.add("grade-column-center");
        }

        let gradeText = category.querySelector(".awarded-grade") || category.querySelector(".no-grade");
        setGradeText(gradeText, sum, max, category);
        gradeText.classList.remove("no-grade");
        gradeText.classList.add("awarded-grade");

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

    let grade = document.createElement("span");
    grade.classList.add("awarded-grade");
    grade.classList.add("injected-title-grade");
    grade.classList.add(courseGrade ? "grade-active-color" : "grade-none-color");
    grade.textContent = courseGrade ? courseGrade.textContent : "—";
    if (grade.textContent.match(/^\d+\.?\d*%/) !== null) {
        let percent = Number.parseFloat(grade.textContent.substr(0, grade.textContent.length - 1));
        let letterGrade = percent >= 90 ? "A" : (percent >= 80 ? "B" : (percent >= 70 ? "C" : (percent >= 60 ? "D" : "F")));
        grade.textContent = `${letterGrade} (${percent}%)`;
        grade.title = "Letter grade calculated assuming 10% grading scale";
    }
    title.appendChild(grade);

    gradeText = periods[0].querySelector(".awarded-grade");
    setGradeText(gradeText, classPoints, classTotal, periods[0], classTotal === 0);
    for (let i = 1; i < periods.length; i++) {
        periods[i].remove();
    }
}

if (!document.location.search.includes("past") || document.location.search.split("past=")[1] != 1) {
    for (let course of coursesByPeriod) {
        if (course) {
            course.parentElement.appendChild(course);
        }
    }

    let timeRow = document.getElementById("past-selector") || document.querySelector(".content-top-upper").insertAdjacentElement('afterend', document.createElement("div"));

    let label = document.createElement("label");
    label.textContent = "Enable grade modification";
    label.htmlFor = "enable-modify";
    label.classList.add("modify-label");
    timeRow.appendChild(label);

    let checkBox = document.createElement("input");
    checkBox.type = "checkbox";
    checkBox.id = "enable-modify";
    checkBox.onclick = () => {
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
    } else {
        document.location.reload();
    }
    };
    timeRow.appendChild(checkBox);
}

function processNonenteredAssignment(assignment) {
    let noGrade = assignment.getElementsByClassName("no-grade")[0];
    let newGrade = document.createElement("span");
    newGrade.textContent += "N/A";
    newGrade.classList.add("max-grade");
    newGrade.classList.add("injected-assignment-percent");

    // td-content-wrapper
    noGrade.parentElement.appendChild(document.createElement("br"));
    noGrade.parentElement.appendChild(newGrade);

    if (noGrade.parentElement.classList.contains("exception-grade-wrapper")) {
        noGrade.remove();
    }
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
        // currently there exists a letter grade here, we want to put a point score here and move the letter grade
        let text = gradeElement.parentElement.textContent;
        let textContent = gradeElement.parentElement.textContent;
        gradeElement.parentElement.classList.add("grade-column-center");
        //gradeElement.parentElement.style.textAlign = "center";
        //gradeElement.parentElement.style.paddingRight = "30px";
        gradeElement.innerHTML = "";
        // create the elements for our point score
        let span = document.createElement("span");
        span.textContent = doNotDisplay ? "" : Math.round(sum * 100) / 100;
        span.classList.add("rounded-grade");
        gradeElement.appendChild(span);
        span = document.createElement("span");
        span.textContent = doNotDisplay ? "" : ` / ${Math.round(max * 100) / 100}`;
        span.classList.add("max-grade");
        gradeElement.appendChild(span);
        // move the letter grade over to the right
        span = row.querySelector(".comment-column").firstChild;
        span.textContent = text;
        if (span.textContent.match(/^\d+\.?\d*%/) !== null) {
            let percent = Number.parseFloat(span.textContent.substr(0, span.textContent.length - 1));
            let letterGrade = percent >= 90 ? "A" : (percent >= 80 ? "B" : (percent >= 70 ? "C" : (percent >= 60 ? "D" : "F")));
            span.textContent = `${letterGrade} (${percent}%)`;
            span.title = "Letter grade calculated assuming 10% grading scale";
        }
        // restyle the right hand side
        span.parentElement.classList.remove("comment-column");
        span.parentElement.classList.add("grade-column");
        span.parentElement.classList.add("grade-column-right");
        //span.style.cssFloat = "right"; //maybe remove
        //span.style.color = "#3aa406";
        //span.style.fontWeight = "bold";
    }
}

function generateScoreModifyWarning() {
    let modAssignWarning = document.createElement("img");
    modAssignWarning.src = "https://image.flaticon.com/icons/svg/179/179386.svg";
    //modAssignWarning.width = genSize;
    modAssignWarning.title = "This grade has been modified from its true value.";
    modAssignWarning.classList.add("modified-score-percent-warning");
    return modAssignWarning;
}

function createEditListener(gradeColContentWrap, catRow, perRow, finishedCallback) {
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
                let regexResult = /^(-?\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)$/.exec(editElem.textContent);
                if (!regexResult) {
                    return false;
                }
                userScore = Number.parseFloat(regexResult[1]);
                userMax = Number.parseFloat(regexResult[3]);
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
                maxGrade = document.createElement("span");
                maxGrade.classList.add("max-grade");
                maxGrade.textContent = " / " + userMax;
                gradeColContentWrap.prepend(maxGrade);
                let awardedGrade = document.createElement("span");
                awardedGrade.classList.add("awarded-grade");
                score = document.createElement("span");
                score.classList.add("rounded-grade");
                score.title = userScore;
                score.textContent = userScore;
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
            // now category
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
                for (let category of perRow.parentElement.getElementsByClassName("category-row")) {
                    let weightPercent = category.querySelector(".percentage-contrib").textContent;
                    let col = category.querySelector(".grade-column-right");
                    if (col) {
                        let scorePercent = Number.parseFloat(col.textContent.match(/(\d+\.?\d*)%/)[1]);
                        total += (weightPercent.slice(1, -2) / 100) * scorePercent;
                        awardedPeriodPercent.title = total + "%";
                        awardedPeriodPercent.textContent = (Math.round(total * 100) / 100) + "%";
                    }
                }
            }

            if (!awardedPeriodPercentContainer.querySelector(".modified-score-percent-warning")) {
                awardedPeriodPercentContainer.prepend(generateScoreModifyWarning());
            }

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
