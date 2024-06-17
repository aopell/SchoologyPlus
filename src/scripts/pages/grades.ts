import $ from "jquery";

import { activateGradesPage } from "../features/old-what-if-grades";
import { loadWhatIfGrades } from "../features/what-if-grades";
import { trackEvent } from "../utils/analytics";
import { createElement } from "../utils/dom";
import { Logger } from "../utils/logger";
import Modal from "../utils/modal";
import { Settings } from "../utils/splus-settings";

const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));
const BUG_REPORT_FORM_LINK =
    "https://docs.google.com/forms/d/e/1FAIpQLScF1_MZofOWT9pkWp3EfKSvzCPpyevYtqbAucp1K5WKGlckiA/viewform?entry.118199430=";
export const SINGLE_COURSE = window.location.href.includes("/course/");

interface EditDisableReason {
    version: string;
    errors: string[];
    allCausedBy403: boolean;
    causedByNoApiKey: boolean;
}

export var editDisableReason: EditDisableReason | null = null;
export var invalidCategories: string[] = [];
export var fetchQueue: [x: () => Promise<void>, y: number][] = [];

export async function load() {
    document.documentElement.classList.add("splus-is-grades-page");

    loadContextMenu();

    try {
        loadWhatIfGrades();
    } catch (err) {
        Logger.error("Error loading what-if grades", err);
    }

    await activateGradesPage();

    Logger.log("Retrieving (" + fetchQueue.length + ") nonentered assignments info...");
    processNonenteredAssignments();
}

export function addEditDisableReason(
    err: any = "Unknown Error",
    causedBy403 = false,
    causedByNoApiKey = false
) {
    if (!editDisableReason) {
        editDisableReason = {
            version: chrome.runtime.getManifest().version,
            errors: [],
            allCausedBy403: causedBy403,
            causedByNoApiKey: causedByNoApiKey,
        };
    }
    editDisableReason.errors.push(err);
    editDisableReason.allCausedBy403 = editDisableReason.allCausedBy403 && causedBy403;
    editDisableReason.causedByNoApiKey = editDisableReason.causedByNoApiKey || causedByNoApiKey;
    Logger.debug(editDisableReason, err, causedBy403, causedByNoApiKey);
}

function loadContextMenu() {
    $.contextMenu({
        selector: ".gradebook-course-title",
        items: {
            options: {
                name: "Course Options",
                callback: function (this: any, key: any, opt: any) {
                    trackEvent("context_menu_click", {
                        id: "Course Options",
                        context: "Grades Page",
                        legacyTarget: "Course Options",
                        legacyAction: "click",
                        legacyLabel: "Grades Context Menu",
                    });
                    Modal.openModal("course-settings-modal", {
                        courseId: this[0].parentElement.id.match(/\d+/)[0],
                        courseName: this[0].querySelector("a span:nth-child(3)")
                            ? this[0].querySelector("a span:nth-child(2)").textContent
                            : this[0].innerText.split("\n")[0],
                    });
                },
            },
            grades: {
                name: "Change Grading Scale",
                callback: function (this: any, key: any, opt: any) {
                    trackEvent("context_menu_click", {
                        id: "Change Grading Scale",
                        context: "Grades Page",
                        legacyTarget: "Change Grading Scale",
                        legacyAction: "click",
                        legacyLabel: "Grades Context Menu",
                    });
                    Modal.openModal("course-settings-modal", {
                        courseId: this[0].parentElement.id.match(/\d+/)[0],
                        courseName: this[0].querySelector("a span:nth-child(3)")
                            ? this[0].querySelector("a span:nth-child(2)").textContent
                            : this[0].innerText.split("\n")[0],
                    });
                },
            },
            separator: "-----",
            materials: {
                name: "Materials",
                callback: function (this: any, key: any, opt: any) {
                    trackEvent("context_menu_click", {
                        id: "Materials",
                        context: "Grades Page",
                        legacyTarget: "Materials",
                        legacyAction: "click",
                        legacyLabel: "Grades Context Menu",
                    });
                    window.open(
                        `https://${Settings.DefaultDomain.value}/course/${
                            this[0].parentElement.id.match(/\d+/)[0]
                        }/materials`,
                        "_blank"
                    );
                },
            },
            updates: {
                name: "Updates",
                callback: function (this: any, key: any, opt: any) {
                    trackEvent("context_menu_click", {
                        id: "Updates",
                        context: "Grades Page",
                        legacyTarget: "Updates",
                        legacyAction: "click",
                        legacyLabel: "Grades Context Menu",
                    });
                    window.open(
                        `https://${Settings.DefaultDomain.value}/course/${
                            this[0].parentElement.id.match(/\d+/)[0]
                        }/updates`,
                        "_blank"
                    );
                },
            },
            student_grades: {
                name: "Grades",
                callback: function (this: any, key: any, opt: any) {
                    trackEvent("context_menu_click", {
                        id: "Grades",
                        context: "Grades Page",
                        legacyTarget: "Grades",
                        legacyAction: "click",
                        legacyLabel: "Grades Context Menu",
                    });
                    window.open(
                        `https://${Settings.DefaultDomain.value}/course/${
                            this[0].parentElement.id.match(/\d+/)[0]
                        }/student_grades`,
                        "_blank"
                    );
                },
            },
            mastery: {
                name: "Mastery",
                callback: function (this: any, key: any, opt: any) {
                    trackEvent("context_menu_click", {
                        id: "Mastery",
                        context: "Grades Page",
                        legacyTarget: "Mastery",
                        legacyAction: "click",
                        legacyLabel: "Grades Context Menu",
                    });
                    window.open(
                        `https://${Settings.DefaultDomain.value}/course/${
                            this[0].parentElement.id.match(/\d+/)[0]
                        }/mastery`,
                        "_blank"
                    );
                },
            },
            members: {
                name: "Members",
                callback: function (this: any, key: any, opt: any) {
                    trackEvent("context_menu_click", {
                        id: "Members",
                        context: "Grades Page",
                        legacyTarget: "Members",
                        legacyAction: "click",
                        legacyLabel: "Grades Context Menu",
                    });
                    window.open(
                        `https://${Settings.DefaultDomain.value}/course/${
                            this[0].parentElement.id.match(/\d+/)[0]
                        }/members`,
                        "_blank"
                    );
                },
            },
        },
    });
}

export function createAddAssignmentElement(category: HTMLElement) {
    let addAssignmentThing = createElement("tr", [
        "report-row",
        "item-row",
        "last-row-of-tier",
        "grade-add-indicator",
    ]);
    addAssignmentThing.dataset.parentId = category.dataset.id;
    // to avoid a hugely annoying DOM construction
    // edit indicator will be added later
    // FIXME add little plus icon
    addAssignmentThing.innerHTML =
        '<th scope="row" class="title-column clickable"><div class="reportSpacer-3"><div class="td-content-wrapper"><span class="title"><a class="sExtlink-processed">Add Assignment</a></span></div></div></th><td class="grade-column"><div class="td-content-wrapper"><span class="no-grade">—</span><div class="grade-wrapper"></div></div></td><td class="comment-column"><div class="td-content-wrapper"><span class="visually-hidden">No comment</span></div></td>';
    addAssignmentThing
        .getElementsByClassName("title")[0]
        .firstElementChild?.addEventListener("click", function (event) {
            if ((event.target as HTMLElement | null)?.contentEditable !== "true") {
                addAssignmentThing
                    .querySelector<HTMLAnchorElement>("img.grade-edit-indicator")
                    ?.click();
            } else {
                document.execCommand("selectall", false, null as any);
            }
        });
    return addAssignmentThing;
}

function processNonenteredAssignments() {
    if (fetchQueue.length > 0) {
        let [func, attempts] = fetchQueue.shift()!;
        let sleep = attempts > 0;
        setTimeout(
            () => {
                func()
                    .then(() => {
                        processNonenteredAssignments();
                    })
                    .catch(err => {
                        Logger.warn("Caught error: ", err);
                        Logger.log("Waiting 3 seconds to avoid rate limit");
                        if (err && err.firstTryError && err.firstTryError.status === 403) {
                            attempts = 100;
                        }
                        if (attempts > 3) {
                            Logger.warn("Maximum attempts reached; aborting");
                        } else {
                            fetchQueue.push([func, attempts + 1]);
                        }
                        processNonenteredAssignments();
                    });
            },
            sleep ? 3000 : 0
        );
    }
}

/**
 * Rounds a decimal number to the specified number of decimal places.
 *
 * @param num - The number to round.
 * @param dec - The number of decimal places to round to.
 * @returns The rounded number.
 */
export function roundDecimal(num: number, dec: number) {
    let intPart = Math.floor(num);
    let floatPart = num - intPart;
    return intPart + Math.round(floatPart * Math.pow(10, dec)) / Math.pow(10, dec);
}
