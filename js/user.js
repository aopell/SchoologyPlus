(function () {
    let sidebar = document.getElementById("content-left");
    let loadCommonCourses = null;

    if (sidebar) {
        let button = createButton("splus-user-courses-in-common-btn", "Courses in Common");
        let img = createElement("img", [], { src: chrome.runtime.getURL("imgs/plus-icon.png"), width: 18, style: { verticalAlign: "middle", paddingLeft: "4px" } });
        button.prepend(img);
        button.querySelector("input").style.paddingLeft = "4px";
        button.style.cursor = "pointer";
        button.addEventListener("click", () => {
            if (loadCommonCourses == null) {
                loadCommonCourses = getCoursesInCommon(document.location.href.match(/\/(\d+)\//)[1]);
            }
            openModal("user-courses-in-common-modal", { loadCommonCourses: loadCommonCourses, userId: document.location.href.match(/\/(\d+)\//)[1] });
        });

        sidebar.appendChild(button);
    }
})();

function clearNodeChildren(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

async function processEnrollment(initialEnrollments, owner, commonList, otherUserId) {
    let enrollments = initialEnrollments;
    do {
        if (enrollments.enrollment.some(x => x.uid == otherUserId)) {
            commonList.push(owner);
            break;
        } else if (enrollments.links.next) {
            enrollments = await (await fetchWithApiAuthentication(enrollments.links.next)).json();
        } else {
            enrollments = null;
        }
    } while (enrollments);
}

async function getCoursesInCommon(otherUserId) {
    let coursesInCommon = [];
    let myClasses = (await fetchApiJson(`/users/${getUserId()}/sections`)).section;
    for (let section of myClasses) {
        await processEnrollment(await fetchApiJson(`/sections/${section.id}/enrollments`), section, coursesInCommon, otherUserId);
    }
    Logger.log("Finished processing enrollments");

    return coursesInCommon;
}

function setCourseListModalContent(modal, options) {
    let listElem = document.getElementById("user-courses-in-common-list");
    clearNodeChildren(listElem);
    listElem.appendChild(createElement("li", [], { textContent: "Loading..." }));
    options.loadCommonCourses.then(coursesInCommon => {
        clearNodeChildren(listElem);

        let aliases = Setting.getValue("courseAliases") || {};

        if (coursesInCommon.length == 0) {
            listElem.appendChild(createElement("li", [], { textContent: "No common courses found" }));
        } else {
            for (let section of coursesInCommon) {
                listElem.appendChild(createElement("li", [], {}, [
                    createElement("img", [], { src: section.profile_url, alt: `Profile picture for ${section.course_title}: ${section.section_title}` }),
                    createElement("a", [], { href: `https://${Setting.getValue("defaultDomain")}/course/${section.id}`, textContent: aliases[section.id] || `${section.course_title}: ${section.section_title}` })
                ]));
            }
        }
        Theme.setProfilePictures(listElem.getElementsByTagName("img"));
    })
    .catch(err => Logger.error("Error building courses in common: ", err));
}

modals.push(new Modal("user-courses-in-common-modal", "Courses In Common", createElement("div", [], {}, [
    createElement("div", ["splus-modal-contents"], {}, [
        createElement("ul", ["setting-entry", "common-realm-list"], { id: "user-courses-in-common-list" }, [])
    ])
]), modalFooterText, setCourseListModalContent));

document.querySelector("#user-courses-in-common-modal .close").onclick = modalClose;
