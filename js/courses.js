while (!window.splusLoaded || !window.splusLoaded.has("all")) { }
Logger.debug("Started loading courses.js");

for (let course of document.querySelectorAll("li.course-item.list-item")) {
    let parent = course.parentNode;
    let wrapper = document.createElement("div");
    parent.replaceChild(wrapper, course);
    wrapper.appendChild(course);
    course.prepend(createElement("img", ["course-list-icon"], { src: Theme.getIcon(course.querySelector(".course-title").textContent) || chrome.runtime.getURL("imgs/fallback-course-icon.svg") }));
    
    let kabobMenuButton = createElement("span", ["courses-kabob-menu"], {
        textContent: "⠇",
        onclick: function (event) {
            $(course).contextMenu({ x: event.pageX, y: event.pageY });
        }
    });
    course.querySelector("p.course-info").appendChild(kabobMenuButton);
}

$.contextMenu({
    selector: "li.course-item.list-item",
    items: {
        options: {
            name: "Course Options",
            callback: function (key, opt) {
                trackEvent("Course Options", "click", "Courses Context Menu");
                openModal("course-settings-modal", {
                    courseId: this[0].querySelector(".section-item").id.match(/\d+/)[0],
                    courseName: `${this[0].querySelector(".course-title").textContent}: ${this[0].querySelector(".section-item").textContent}`
                });
            }
        },
        separator: "-----",
        materials: {
            name: "Materials",
            callback: function (key, opt) {
                trackEvent("Materials", "click", "Courses Context Menu");
                window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/materials`, "_blank")
            }
        },
        updates: {
            name: "Updates",
            callback: function (key, opt) {
                trackEvent("Updates", "click", "Courses Context Menu");
                window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/updates`, "_blank")
            }
        },
        student_grades: {
            name: "Grades",
            callback: function (key, opt) {
                trackEvent("Grades", "click", "Courses Context Menu");
                window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/student_grades`, "_blank")
            }
        },
        mastery: {
            name: "Mastery",
            callback: function (key, opt) {
                trackEvent("Mastery", "click", "Courses Context Menu");
                window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/mastery`, "_blank")
            }
        },
        members: {
            name: "Members",
            callback: function (key, opt) {
                trackEvent("Members", "click", "Courses Context Menu");
                window.open(`https://${Setting.getValue("defaultDomain")}/course/${this[0].querySelector(".section-item").id.match(/\d+/)[0]}/members`, "_blank")
            }
        }
    }
});

if (location.search.includes("reorder")) {
    document.querySelector("#reorder-ui .link-btn").click();
}

Logger.debug("Finished loading courses.js");