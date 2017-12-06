document.body.onload = () => {
    document.getElementById("home").innerHTML = svg;
    if (document.location.pathname === "/grades/grades") {
        let inner = document.getElementById("main-inner");
        let courses = inner.getElementsByClassName("gradebook-course");

        for (let course of courses) {
            title = course.getElementsByClassName("gradebook-course-title")[0];
            summary = course.getElementsByClassName("summary-course")[0];
            courseGrade = summary.getElementsByClassName("awarded-grade")[0];

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