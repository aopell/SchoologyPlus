import $ from "jquery";
import "jquery-contextmenu";

import { trackEvent } from "../utils/analytics";
import { createElement } from "../utils/dom";
import { Logger } from "../utils/logger";
import Modal from "../utils/modal";
import { Setting } from "../utils/settings";
import Theme from "../utils/theme";

export async function load() {
    for (let course of document.querySelectorAll("li.course-item.list-item")) {
        let parent = course.parentNode;
        let wrapper = document.createElement("div");
        parent?.replaceChild(wrapper, course);
        wrapper.appendChild(course);
        course.prepend(
            createElement("img", ["course-list-icon"], {
                src:
                    Theme.getIcon(course.querySelector(".course-title")?.textContent) ||
                    chrome.runtime.getURL("imgs/fallback-course-icon.svg"),
            })
        );

        let kabobMenuButton = createElement("span", ["courses-kabob-menu"], {
            textContent: "⠇",
            onclick: function (event) {
                $(course).contextMenu({ x: event.pageX, y: event.pageY });
            },
        });
        course.querySelector("p.course-info")?.appendChild(kabobMenuButton);
    }

    $.contextMenu({
        selector: "li.course-item.list-item",
        items: {
            options: {
                name: "Course Options",
                callback: function (key, opt) {
                    trackEvent("context_menu_click", {
                        id: "Course Options",
                        context: "Courses Page",
                        legacyTarget: "Course Options",
                        legacyAction: "click",
                        legacyLabel: "Courses Context Menu",
                    });
                    Modal.openModal("course-settings-modal", {
                        courseId: this[0].querySelector(".section-item").id.match(/\d+/)[0],
                        courseName: `${this[0].querySelector(".course-title").textContent}: ${
                            this[0].querySelector(".section-item").textContent
                        }`,
                    });
                },
            },
            separator: "-----",
            materials: {
                name: "Materials",
                callback: function (key, opt) {
                    trackEvent("context_menu_click", {
                        id: "Materials",
                        context: "Courses Page",
                        legacyTarget: "Materials",
                        legacyAction: "click",
                        legacyLabel: "Courses Context Menu",
                    });
                    window.open(
                        `https://${Setting.getValue("defaultDomain")}/course/${
                            this[0].querySelector(".section-item").id.match(/\d+/)[0]
                        }/materials`,
                        "_blank"
                    );
                },
            },
            updates: {
                name: "Updates",
                callback: function (key, opt) {
                    trackEvent("context_menu_click", {
                        id: "Updates",
                        context: "Courses Page",
                        legacyTarget: "Updates",
                        legacyAction: "click",
                        legacyLabel: "Courses Context Menu",
                    });
                    window.open(
                        `https://${Setting.getValue("defaultDomain")}/course/${
                            this[0].querySelector(".section-item").id.match(/\d+/)[0]
                        }/updates`,
                        "_blank"
                    );
                },
            },
            student_grades: {
                name: "Grades",
                callback: function (key, opt) {
                    trackEvent("context_menu_click", {
                        id: "Grades",
                        context: "Courses Page",
                        legacyTarget: "Grades",
                        legacyAction: "click",
                        legacyLabel: "Courses Context Menu",
                    });
                    window.open(
                        `https://${Setting.getValue("defaultDomain")}/course/${
                            this[0].querySelector(".section-item").id.match(/\d+/)[0]
                        }/student_grades`,
                        "_blank"
                    );
                },
            },
            mastery: {
                name: "Mastery",
                callback: function (key, opt) {
                    trackEvent("context_menu_click", {
                        id: "Mastery",
                        context: "Courses Page",
                        legacyTarget: "Mastery",
                        legacyAction: "click",
                        legacyLabel: "Courses Context Menu",
                    });
                    window.open(
                        `https://${Setting.getValue("defaultDomain")}/course/${
                            this[0].querySelector(".section-item").id.match(/\d+/)[0]
                        }/mastery`,
                        "_blank"
                    );
                },
            },
            members: {
                name: "Members",
                callback: function (key, opt) {
                    trackEvent("context_menu_click", {
                        id: "Members",
                        context: "Courses Page",
                        legacyTarget: "Members",
                        legacyAction: "click",
                        legacyLabel: "Courses Context Menu",
                    });
                    window.open(
                        `https://${Setting.getValue("defaultDomain")}/course/${
                            this[0].querySelector(".section-item").id.match(/\d+/)[0]
                        }/members`,
                        "_blank"
                    );
                },
            },
        },
    });

    if (location.search.includes("reorder")) {
        setTimeout(() => {
            document.querySelector<HTMLAnchorElement>("#reorder-ui .link-btn")?.click();
        }, 750);
    }

    Logger.debug("Finished loading courses.js");
}
