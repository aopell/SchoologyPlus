let courses = document.getElementsByClassName("gradebook-course-title");
let coursesByPeriod = [];

for (let course of courses) {
    coursesByPeriod[Number.parseInt(course.textContent.match(/PERIOD (\d)/)[1])] = course;
}

if (Setting.getValue("orderClasses") == "period") {
    for (let course of coursesByPeriod) {
        if (course) {
            course.parentElement.appendChild(course);
        }
    }
}