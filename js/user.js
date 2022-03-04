(async function () {
    // Wait for loader.js to finish running
    while (!window.splusLoaded) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    await loadDependencies("user", ["all"]);
})();

(async function () {
    // I hate try..catch but It will work
    try {
        const inCommonID = "user-courses-in-common-list";
        const page = document.getElementById("main-inner") || document.getElementById("main");
        const userID = document.location.href.match(/\/(\d+)\//)[1];
        const loadCommonCourses = getCoursesInCommon(userID);
        const outerContainer = createElement("div", ["course-in-common-container"]);
        const container = createElement("div", [], {}, [
            createElement("ul", ["setting-entry", "common-realm-list"], { id: inCommonID }, [])
        ]);
        const title = createElement("h4", ["mimic-profile-header"], { textContent: "Courses In Common" });
        outerContainer.appendChild(title);
        outerContainer.appendChild(container);
        page.appendChild(outerContainer);
        populateCourseList(inCommonID, loadCommonCourses);
    } catch (err) {
        Logger.error(err);
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

function populateCourseList(targetListElem, loadCourseFunction) {
    let listElem = document.getElementById(targetListElem);
    clearNodeChildren(listElem);
    listElem.appendChild(createElement("li", [], { textContent: "Loading..." }));
    loadCourseFunction.then(coursesInCommon => {
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
        .catch(err => {
            Logger.error("Error building courses in common: ", err);
            let listElem = document.getElementById(targetListElem);
            clearNodeChildren(listElem);
            listElem.appendChild(createElement("li", [], { textContent: "Failed to load courses in common." }));
        });
}
