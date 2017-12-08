console.debug("Running Schoology Plus grades page improvement script");
let inner = document.getElementById("main-inner") || document.getElementById("content-wrapper");
let courses = inner.getElementsByClassName("gradebook-course");
for (let course of courses) {
    let title = course.getElementsByClassName("gradebook-course-title")[0];
    let summary = course.getElementsByClassName("summary-course")[0];
    let courseGrade = summary.getElementsByClassName("awarded-grade")[0];
    let table = course.getElementsByClassName("gradebook-course-grades")[0].firstElementChild;
    let grades = table.firstElementChild;
    let categories = grades.getElementsByClassName("category-row");
    let rows = Array.from(grades.children);

    let classPoints = 0;
    let classTotal = 0;
    let addMoreClassTotal = true;

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
                sum += assignmentScore;
                max += assignmentMax;

                let newGrade = document.createElement("span");
                newGrade.textContent += assignmentMax === 0 ? "EC" : `${Math.round(assignmentScore * 100 / assignmentMax)}%`;
                newGrade.title = assignmentMax === 0 ? "Extra Credit" : `${assignmentScore * 100 / assignmentMax}%`;
                newGrade.classList.add("max-grade");

                // td-content-wrapper
                maxGrade.parentElement.appendChild(document.createElement("br"));
                maxGrade.parentElement.appendChild(newGrade);
            }
            else {
                let noGrade = assignment.getElementsByClassName("no-grade")[0];
                let newGrade = document.createElement("span");
                newGrade.textContent += "N/A";
                newGrade.classList.add("max-grade");

                // td-content-wrapper
                noGrade.parentElement.appendChild(document.createElement("br"));
                noGrade.parentElement.appendChild(newGrade);

                if (noGrade.parentElement.classList.contains("exception-grade-wrapper")) {
                    noGrade.remove();
                }
            }
            //assignment.style.padding = "7px 30px 5px";
            //assignment.style.textAlign = "center";
        }

        if(assignments.length === 0) {
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
    title.appendChild(grade);

    let periods = course.getElementsByClassName("period-row");
    gradeText = periods[0].getElementsByClassName("awarded-grade")[0];
    setGradeText(gradeText, classPoints, classTotal, periods[0], classTotal === 0);
    for (let i = 1; i < periods.length; i++) {
        periods[i].remove();
    }
}

function setGradeText(gradeElement, sum, max, row, doNotDisplay) {
    if (gradeElement) {
        // currently there exists a letter grade here, we want to put a point score here and move the letter grade
        let text = gradeElement.parentElement.innerHTML;
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
        span.innerHTML = text;
        // restyle the right hand side
        span.parentElement.classList.remove("comment-column");
        span.parentElement.classList.add("grade-column");
        span.parentElement.classList.add("grade-column-right");
        //span.style.cssFloat = "right"; //maybe remove
        //span.style.color = "#3aa406";
        //span.style.fontWeight = "bold";
    }
}
