document.body.onload = () => {
    document.getElementById("home").innerHTML = svg;
    if (document.location.pathname === "/grades/grades") {
        let inner = document.getElementById("main-inner");
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
                    if (assignment.classList.contains("dropped")) continue;
                    let score = assignment.getElementsByClassName("rounded-grade")[0];
                    if (score) {
                        sum += Number.parseFloat(score.textContent);
                        max += Number.parseFloat(assignment.getElementsByClassName("max-grade")[0].textContent.substring(3));
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

            if (courseGrade) {
                let grade = document.createElement("span");
                grade.classList.add("awarded-grade");
                grade.style.cssFloat = "right";
                grade.style.color = "#3aa406";
                grade.style.fontWeight = "bold";
                grade.style.fontSize = "14px";
                grade.textContent = courseGrade.textContent;
                title.appendChild(grade);
            }

            let period = course.getElementsByClassName("period-row")[0];
            gradeText = period.getElementsByClassName("awarded-grade")[0];
            setGradeText(gradeText, classPoints, classTotal, period, classTotal === 0);
        }
    }
};

function setGradeText(gradeElement, sum, max, row, doNotDisplay) {
    if (gradeElement) {
        let text = gradeElement.textContent;
        gradeElement.innerHTML = "";
        let span = document.createElement("span");
        span.textContent = doNotDisplay ? '' : Math.round(sum * 100) / 100;
        span.classList.add("rounded-grade");
        gradeElement.appendChild(span);
        span = document.createElement("span");
        span.textContent = doNotDisplay ? '' : ` / ${Math.round(max * 100) / 100} `;
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
