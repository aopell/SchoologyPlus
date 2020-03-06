for (let course of document.querySelectorAll("li.course-item.list-item")) {
    let parent = course.parentNode;
    let wrapper = document.createElement("div");
    parent.replaceChild(wrapper, course);
    wrapper.appendChild(course);
    course.prepend(createElement("img", ["course-list-icon"], { src: Theme.getIcon(course.querySelector(".course-title").textContent) }));
}

$.contextMenu({
    selector: "li.course-item.list-item",
    items: {
        options: {
            name: "Course Options",
            callback: function (key, opt) {
                openModal("course-settings-modal", {
                    courseId: this[0].querySelector(".section-item").id.match(/\d+/)[0],
                    courseName: `${this[0].querySelector(".course-title").textContent}: ${this[0].querySelector(".section-item").textContent}`
                });
            }
        },
        separator: "-----",
        materials: {
            name: "Materials",
            callback: function (key, opt) { window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/materials`, "_blank") }
        },
        updates: {
            name: "Updates",
            callback: function (key, opt) { window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/updates`, "_blank") }
        },
        student_grades: {
            name: "Grades",
            callback: function (key, opt) { window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/student_grades`, "_blank") }
        },
        mastery: {
            name: "Mastery",
            callback: function (key, opt) { window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/mastery`, "_blank") }
        },
        members: {
            name: "Members",
            callback: function (key, opt) { window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/members`, "_blank") }
        }
    }
});