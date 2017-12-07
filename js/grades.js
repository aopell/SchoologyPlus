function setGradeText(gradeElement, sum, max, row, doNotDisplay) {
    if (gradeElement) {
        let text = gradeElement.textContent;
        gradeElement.innerHTML = "";
        gradeElement.parentElement.style.textAlign = "center";
        gradeElement.parentElement.style.paddingRight = "30px";
        let span = document.createElement("span");
        span.textContent = doNotDisplay ? "" : Math.round(sum * 100) / 100;
        span.classList.add("rounded-grade");
        gradeElement.appendChild(span);
        span = document.createElement("span");
        span.textContent = doNotDisplay ? "" : ` / ${Math.round(max * 100) / 100}`;
        span.classList.add("max-grade");
        gradeElement.appendChild(span);
        span = row.getElementsByClassName("comment-column")[0].firstChild.firstChild;
        span.textContent = text;
        span.classList.add("rounded-grade");
        span.classList.remove("visually-hidden");
        span.style.cssFloat = "right"; //maybe remove
        span.style.color = "#3aa406";
        span.style.fontWeight = "bold";
    }
}

console.log("Running Schoology Plus grades page improvement script");
let inner = document.getElementById("main-inner") || document.getElementById("content-wrapper");
let courses = inner.getElementsByClassName("gradebook-course");
for (let course of courses) {
    let title = course.getElementsByClassName("gradebook-course-title")[0];
    let summary = course.getElementsByClassName("summary-course")[0];
    let courseGrade = summary.getElementsByClassName("awarded-grade")[0];
    let grades = course.getElementsByClassName("gradebook-course-grades")[0].firstElementChild.firstElementChild;
    let categories = grades.getElementsByClassName("category-row");
    let rows = Array.from(grades.children);

    let classPoints = 0;
    let classTotal = 0;

    for (let category of categories) {
        let assignments = rows.filter(x => category.dataset.id == x.dataset.parentId);
        let sum = 0;
        let max = 0;
        for (let assignment of assignments) {
            let maxGrade = assignment.getElementsByClassName("max-grade")[0];
            let score = assignment.getElementsByClassName("rounded-grade")[0];
            if (score) {
                let assignmentScore = Number.parseFloat(score.textContent);
                let assignmentMax = Number.parseFloat(maxGrade.textContent.substring(3));
                sum += assignmentScore;
                max += assignmentMax;

                let newGrade = document.createElement("span");
                newGrade.textContent += assignmentMax === 0 ? "EC" : `${Math.round(assignmentScore * 100 / assignmentMax)}%`;
                newGrade.classList.add("max-grade");
                maxGrade.parentElement.appendChild(document.createElement("br"));
                maxGrade.parentElement.appendChild(newGrade);
                maxGrade.parentElement.style.padding = "7px 30px 5px";
                maxGrade.parentElement.style.textAlign = "center";
            }
            else {
                let noGrade = assignment.getElementsByClassName("no-grade")[0];
                noGrade.parentElement.style.textAlign = "center";
                let newGrade = document.createElement("span");
                newGrade.textContent += "N/A";
                newGrade.classList.add("max-grade");
                noGrade.parentElement.appendChild(document.createElement("br"));
                noGrade.parentElement.appendChild(newGrade);
                noGrade.parentElement.style.padding = "7px 30px 5px";
                noGrade.parentElement.style.textAlign = "center";
            }
        }
        let gradeText = category.getElementsByClassName("awarded-grade")[0];
        setGradeText(gradeText, sum, max, category);
        let weightText = category.getElementsByClassName("percentage-contrib")[0];
        if (!weightText) {
            classPoints += sum;
            classTotal += max;
        }
    }

    let grade = document.createElement("span");
    grade.classList.add("awarded-grade");
    grade.style.cssFloat = "right";
    grade.style.color = courseGrade ? "#3aa406" : "#767676";
    grade.style.fontWeight = "bold";
    grade.style.fontSize = "14px";
    grade.textContent = courseGrade ? courseGrade.textContent : "—";
    title.appendChild(grade);

    let periods = course.getElementsByClassName("period-row");
    gradeText = periods[0].getElementsByClassName("awarded-grade")[0];
    setGradeText(gradeText, classPoints, classTotal, periods[0], classTotal === 0);
    for (let i = 1; i < periods.length; i++) {
        periods[i].remove();
    }
}
