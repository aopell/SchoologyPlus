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
                if (gradeText) {
                    let text = gradeText.textContent;
                    gradeText.innerHTML = "";

                    let span = document.createElement("span");
                    span.textContent = sum;
                    span.classList.add("rounded-grade");
                    gradeText.appendChild(span);

                    span = document.createElement("span");
                    span.textContent = ` / ${max} `;
                    span.classList.add("max-grade");
                    gradeText.appendChild(span);

                    span = category.getElementsByClassName("comment-column")[0].firstChild.firstChild;
                    span.textContent = text;
                    span.classList.add("rounded-grade");
                    span.classList.remove("visually-hidden");
                    span.style.cssFloat = "right"; //maybe remove
                    span.style.color = "#3aa406";
                    span.style.fontWeight = "bold";
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
        }
    }
};