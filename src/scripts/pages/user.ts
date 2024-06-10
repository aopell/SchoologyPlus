import { fetchApiJson, fetchWithApiAuthentication, getUserId } from "../utils/api";
import { createElement } from "../utils/dom";
import { Logger } from "../utils/logger";
import { Settings } from "../utils/splus-settings";
import Theme from "../utils/theme";

export async function load() {
    initCoursesInCommon();
}

function initCoursesInCommon() {
    try {
        const inCommonID = "user-courses-in-common-list";
        const page = document.getElementById("main-inner") || document.getElementById("main");
        const userID = document.location.href.match(/\/(\d+)\//)![1];
        const loadCommonCourses = getCoursesInCommon(userID);
        const outerContainer = createElement("div", ["course-in-common-container"]);
        const container = createElement("div", [], {}, [
            createElement("ul", ["setting-entry", "common-realm-list"], { id: inCommonID }, []),
        ]);
        const title = createElement("h4", ["mimic-profile-header"], {
            textContent: "Courses In Common",
        });
        outerContainer.appendChild(title);
        outerContainer.appendChild(container);
        if (page) {
            page.appendChild(outerContainer);
        } else {
            Logger.error("Failed to find page element to attach courses in common");
        }
        populateCourseList(inCommonID, loadCommonCourses);
    } catch (err) {
        Logger.error(err);
    }
}

/**
 * Removes all child nodes from the given parent node.
 *
 * @param {Node} node - The parent node whose children will be removed.
 */
function clearNodeChildren(node: Node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

async function processEnrollment(
    initialEnrollments: Record<string, any>,
    owner: Record<string, any>,
    commonList: Record<string, any>[],
    otherUserId: string
) {
    let enrollments: Record<string, any> | null = initialEnrollments;
    do {
        if (enrollments.enrollment.some((x: Record<string, string>) => x.uid == otherUserId)) {
            commonList.push(owner);
            break;
        } else if (enrollments.links.next) {
            enrollments = await (await fetchWithApiAuthentication(enrollments.links.next)).json();
        } else {
            enrollments = null;
        }
    } while (enrollments);
}

async function getCoursesInCommon(otherUserId: string) {
    let coursesInCommon: Record<string, any>[] = [];
    let myClasses = (await fetchApiJson(`/users/${getUserId()}/sections`)).section;
    for (let section of myClasses) {
        try {
            await processEnrollment(
                await fetchApiJson(`/sections/${section.id}/enrollments`),
                section,
                coursesInCommon,
                otherUserId
            );
        } catch (err) {
            Logger.warn(`Error checking enrollments for section ${section.id}`, err);
        }
    }
    Logger.log("Finished processing enrollments");

    return coursesInCommon;
}

function populateCourseList(
    targetListElem: string,
    loadCourseFunction: Promise<Record<string, any>[]>
) {
    let listElem = document.getElementById(targetListElem)!;
    clearNodeChildren(listElem);
    listElem.appendChild(createElement("li", [], { textContent: "Loading..." }));
    loadCourseFunction
        .then(coursesInCommon => {
            clearNodeChildren(listElem);

            let aliases = Settings.CourseNicknames.value;

            if (coursesInCommon.length == 0) {
                listElem.appendChild(
                    createElement("li", [], { textContent: "No common courses found" })
                );
            } else {
                for (let section of coursesInCommon) {
                    listElem.appendChild(
                        createElement("li", [], {}, [
                            createElement("img", [], {
                                src: section.profile_url,
                                alt: `Profile picture for ${section.course_title}: ${section.section_title}`,
                            }),
                            createElement("a", [], {
                                href: `https://${Settings.DefaultDomain.value}/course/${section.id}`,
                                textContent:
                                    aliases[section.id] ||
                                    `${section.course_title}: ${section.section_title}`,
                            }),
                        ])
                    );
                }
            }
            Theme.setProfilePictures(listElem.getElementsByTagName("img"));
        })
        .catch(err => {
            Logger.error("Error building courses in common: ", err);
            let listElem = document.getElementById(targetListElem);
            if (listElem) {
                clearNodeChildren(listElem);
                listElem.appendChild(
                    createElement("li", [], { textContent: "Failed to load courses in common." })
                );
            }
        });
}
