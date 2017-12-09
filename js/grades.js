console.log("Running Schoology Plus grades page improvement script");
let inner = document.getElementById("main-inner") || document.getElementById("content-wrapper");
let courses = inner.getElementsByClassName("gradebook-course");
let coursesByPeriod = [];

for (let course of courses) {
    let title = course.getElementsByClassName("gradebook-course-title")[0];
    let summary = course.getElementsByClassName("summary-course")[0];
    let courseGrade = summary.getElementsByClassName("awarded-grade")[0];
    let table = course.getElementsByClassName("gradebook-course-grades")[0].firstElementChild;
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
        for (let assignment of assignments) {
            let maxGrade = assignment.getElementsByClassName("max-grade")[0];
            let score = assignment.getElementsByClassName("rounded-grade")[0] || assignment.getElementsByClassName("rubric-grade-value")[0];
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
            //assignment.style.padding = "7px 30px 5px";
            //assignment.style.textAlign = "center";

            // add UI for grade virtual editing
            let gradeWrapper = assignment.getElementsByClassName("grade-wrapper")[0];
            // FIXME correct behavior for editing dropped assignments
            if (!assignment.classList.contains("dropped")) {
                let editGradeImg = document.createElement("img");
                editGradeImg.src = "https://www.iconninja.com/files/727/965/72/edit-draw-pencile-write-icon.svg";
                editGradeImg.width = 12;
                editGradeImg.classList.add("grade-edit-indicator");
                // we only keep one period anyway
                editGradeImg.addEventListener("click", createEditListener(gradeWrapper.parentElement, category, periods[0]));
                gradeWrapper.appendChild(editGradeImg);
            }
        }

        if (assignments.length === 0) {
            category.getElementsByClassName("grade-column")[0].classList.add("grade-column-center");
        }

        let gradeText = category.getElementsByClassName("awarded-grade")[0];
        setGradeText(gradeText, sum, max, category);
        let weightText = category.getElementsByClassName("percentage-contrib")[0];
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

    gradeText = periods[0].getElementsByClassName("awarded-grade")[0];
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
        span = row.getElementsByClassName("comment-column")[0].firstChild;
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

function createEditListener(gradeColContentWrap, catRow, perRow) {
    return function () {
        let noGrade = gradeColContentWrap.getElementsByClassName("no-grade")[0];
        let score = gradeColContentWrap.getElementsByClassName("rounded-grade")[0] || gradeColContentWrap.getElementsByClassName("rubric-grade-value")[0];
        // note that this will always return (for our injected percentage element)
        let maxGrade = gradeColContentWrap.getElementsByClassName("max-grade")[0];
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
            prepareScoredAssignmentGrade(gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0], userScore, userMax);
            if (!gradeColContentWrap.getElementsByClassName("modified-score-percent-warning")[0]) {
                //gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0].style.paddingRight = "0";
                gradeColContentWrap.appendChild(generateScoreModifyWarning());
            }
            // now category
            // category always has a numeric score, unlike period
            // awarded grade in our constructed element contains both rounded and max
            let awardedCategoryPoints = catRow.getElementsByClassName("rounded-grade")[0].parentNode;
            let catScoreElem = awardedCategoryPoints.getElementsByClassName("rounded-grade")[0];
            let catMaxElem = awardedCategoryPoints.getElementsByClassName("max-grade")[0];
            let newCatScore = Number.parseFloat(catScoreElem.textContent) + deltaPoints;
            let newCatMax = Number.parseFloat(catMaxElem.textContent.substring(3)) + deltaMax;
            catScoreElem.textContent = newCatScore;
            catMaxElem.textContent = " / " + newCatMax;
            if (!awardedCategoryPoints.getElementsByClassName("modified-score-percent-warning")[0]) {
                awardedCategoryPoints.appendChild(generateScoreModifyWarning());
            }
            // category percentage
            // need to recalculate
            // content wrapper in right grade col
            let awardedCategoryPercentContainer = catRow.getElementsByClassName("grade-column-right")[0].firstElementChild;
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

            if (!awardedCategoryPercentContainer.getElementsByClassName("modified-score-percent-warning")[0]) {
                awardedCategoryPercentContainer.prepend(generateScoreModifyWarning());
            }

            let awardedPeriodPercentContainer = perRow.getElementsByClassName("grade-column-right")[0].firstElementChild;
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
            let awardedPeriodPoints = perRow.getElementsByClassName("grade-column-center")[0];
            if (awardedPeriodPoints && awardedPeriodPoints.textContent.trim().length !== 0) {
                // awarded grade in our constructed element contains both rounded and max
                let perScoreElem = awardedPeriodPoints.getElementsByClassName("rounded-grade")[0];
                let perMaxElem = awardedPeriodPoints.getElementsByClassName("max-grade")[0];
                let newPerScore = Number.parseFloat(perScoreElem.textContent) + deltaPoints;
                let newPerMax = Number.parseFloat(perMaxElem.textContent.substring(3)) + deltaMax;
                perScoreElem.textContent = newPerScore;
                perMaxElem.textContent = " / " + newPerMax;
                if (!awardedPeriodPoints.getElementsByClassName("modified-score-percent-warning")[0]) {
                    awardedPeriodPoints.appendChild(generateScoreModifyWarning());
                }

                // go ahead and calculate period percentage here since we know it's unweighted
                let newPerPercent = (newPerScore / newPerMax) * 100;
                awardedPeriodPercent.title = newPerPercent + "%";
                awardedPeriodPercent.textContent = (Math.round(newPerPercent * 100) / 100) + "%";
            }

            if (!awardedPeriodPercentContainer.getElementsByClassName("modified-score-percent-warning")[0]) {
                awardedPeriodPercentContainer.prepend(generateScoreModifyWarning());
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
            } else {
                editElem.focus();
            }
            return false;
        }
        editElem.addEventListener("blur", blurFunc);
        editElem.addEventListener("keydown", keyFunc);
        editElem.focus();
    };
}
