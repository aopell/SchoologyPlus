import $ from "jquery";

import { trackEvent } from "../utils/analytics";
import { fetchApi, fetchApiJson, getUserId } from "../utils/api";
import { EXTENSION_NAME, EXTENSION_WEBSITE } from "../utils/constants";
import { createElement, createSvgLogo } from "../utils/dom";
import { Logger } from "../utils/logger";
import Modal from "../utils/modal";
import { getGradingScale, isLAUSD } from "../utils/settings";
import { Settings } from "../utils/splus-settings";

const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));
const BUG_REPORT_FORM_LINK =
    "https://docs.google.com/forms/d/e/1FAIpQLScF1_MZofOWT9pkWp3EfKSvzCPpyevYtqbAucp1K5WKGlckiA/viewform?entry.118199430=";
const SINGLE_COURSE = window.location.href.includes("/course/");

interface EditDisableReason {
    version: string;
    errors: string[];
    allCausedBy403: boolean;
    causedByNoApiKey: boolean;
}

var editDisableReason: EditDisableReason | null = null;
var invalidCategories: string[] = [];
var fetchQueue: [x: () => Promise<void>, y: number][] = [];

export async function load() {
    document.documentElement.classList.add("splus-is-grades-page");

    loadContextMenu();

    await activateGradesPage();

    Logger.log("Retrieving (" + fetchQueue.length + ") nonentered assignments info...");
    processNonenteredAssignments();
}

function addEditDisableReason(
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

async function activateGradesPage() {
    Logger.log(`Running ${EXTENSION_NAME} grades page improvement script`);

    let inner = document.getElementById("main-inner") || document.getElementById("content-wrapper");
    let courses = Array.from(
        inner?.getElementsByClassName("gradebook-course") ?? []
    ) as HTMLElement[];
    let coursesByPeriod: HTMLElement[] = [];
    let gradesModified = false;

    let upperPeriodSortBound = 20;

    let courseLoadTasks: Promise<void>[] = [];

    for (let course of courses) {
        courseLoadTasks.push(
            (async function () {
                let title = course.querySelector<HTMLAnchorElement>(".gradebook-course-title")!;
                let summary = course.querySelector(".summary-course")!;
                let courseId = title.parentElement!.id.match(/\d+/)![0];
                let courseGrade: HTMLElement | null = null;
                if (summary) {
                    courseGrade = summary.querySelector(".awarded-grade");
                } else {
                    try {
                        let finalGradeArray = (
                            await fetchApiJson(`users/${getUserId()}/grades?section_id=${courseId}`)
                        ).section[0].final_grade;
                        courseGrade = createElement("span", [], {
                            textContent: `${finalGradeArray[
                                finalGradeArray.length - 1
                            ].grade.toString()}%`,
                        });
                    } catch {
                        courseGrade = null;
                    }
                }
                let table = course.querySelector(".gradebook-course-grades")!.firstElementChild!;
                let grades = table.firstElementChild!;
                let categories = Array.from(
                    grades.getElementsByClassName("category-row")
                ) as HTMLElement[];
                let rows = Array.from(grades.children) as HTMLElement[];
                let periods = Array.from(course.getElementsByClassName("period-row")).filter(
                    x => !x.textContent!.includes("(no grading period)")
                ) as HTMLElement[];

                let classPoints = 0;
                let classTotal = 0;
                let addMoreClassTotal = true;

                // if there's no PERIOD \d string in the course name, match will return null; in that case, use the array [null, i++]
                // OR is lazy, so the ++ won't trigger unnecessarily; upperPeriodSortBound is our array key, and we use it to give a unique index (after all course) to periodless courses
                coursesByPeriod[
                    Number.parseInt(
                        (title.textContent?.match(/\b[Pp][Ee]?[Rr]?[Ii]?[Oo]?[Dd]?\s*(\d+)/) || [
                            null,
                            (upperPeriodSortBound++).toString(),
                        ])[1]
                    )
                ] = course;

                // Fix width of assignment columns
                table.appendChild(
                    createElement("colgroup", [], {}, [
                        createElement("col", ["assignment-column"]),
                        createElement("col", ["points-column"]),
                        createElement("col", ["comments-column"]),
                    ])
                );

                let kabobMenuButton = createElement("span", ["grades-kabob-menu"], {
                    textContent: "⠇",
                    onclick: function (event) {
                        $(title).contextMenu({ x: event.pageX, y: event.pageY });
                        // hacky way to prevent the course from expanding
                        title.click();
                    },
                });
                let grade = createElement(
                    "span",
                    [
                        "awarded-grade",
                        "injected-title-grade",
                        courseGrade ? "grade-active-color" : "grade-none-color",
                    ],
                    { textContent: "LOADING" }
                );
                title.appendChild(kabobMenuButton);
                title.appendChild(grade);

                for (let period of periods) {
                    let periodPoints = 0;
                    let periodTotal = 0;
                    let invalidatePerTotal = false;

                    for (let category of categories.filter(
                        x => period.dataset.id == x.dataset.parentId
                    )) {
                        try {
                            let assignments = rows.filter(
                                x => category.dataset.id == x.dataset.parentId
                            );
                            let sum = 0;
                            let max = 0;
                            let processAssignment = async function (assignment: HTMLElement) {
                                let maxGrade = assignment.querySelector(".max-grade");
                                let score =
                                    assignment.querySelector(".rounded-grade") ||
                                    assignment.querySelector(".rubric-grade-value");

                                if (!maxGrade && !score && !assignment.querySelector(".no-grade")) {
                                    // some schoology assignments don't display a grade, so we need to create a placeholder
                                    assignment
                                        .querySelector(".grade-column > .td-content-wrapper")
                                        ?.prepend(
                                            createElement("span", ["no-grade"], {
                                                textContent: "—",
                                            })
                                        );
                                }

                                if (score && maxGrade) {
                                    let assignmentScore = Number.parseFloat(score.textContent!);
                                    let assignmentMax = Number.parseFloat(
                                        maxGrade.textContent!.substring(3)
                                    );

                                    if (!assignment.classList.contains("dropped")) {
                                        sum += assignmentScore;
                                        max += assignmentMax;
                                    }

                                    let newGrade = document.createElement("span");
                                    prepareScoredAssignmentGrade(
                                        newGrade,
                                        assignmentScore,
                                        assignmentMax
                                    );

                                    // td-content-wrapper
                                    maxGrade.parentElement!.appendChild(
                                        document.createElement("br")
                                    );
                                    maxGrade.parentElement!.appendChild(newGrade);
                                } else {
                                    queueNonenteredAssignment(
                                        assignment,
                                        courseId,
                                        period,
                                        category
                                    );
                                }
                                if (assignment.querySelector(".missing")) {
                                    // get denominator for missing assignment
                                    let p = assignment.querySelector(
                                        ".injected-assignment-percent"
                                    ) as HTMLElement;
                                    p.textContent = "0%";
                                    p.title = "Assignment missing";
                                    Logger.log(
                                        `Fetching max points for assignment ${assignment.dataset.id?.substr(
                                            2
                                        )}`
                                    );

                                    let json = await fetchApiJson(
                                        `users/${getUserId()}/grades?section_id=${courseId}`
                                    );

                                    if (json.section.length === 0) {
                                        throw new Error("Assignment details could not be read");
                                    }

                                    const assignments = json.section[0].period.reduce(
                                        (prevVal: any[], curVal: any) =>
                                            prevVal.concat(curVal.assignment),
                                        []
                                    ); //combines the assignment arrays from each period
                                    let pts = Number.parseFloat(
                                        assignments.filter(
                                            (x: any) =>
                                                x.assignment_id == assignment.dataset.id?.substr(2)
                                        )[0].max_points
                                    );
                                    if (!assignment.classList.contains("dropped")) {
                                        max += pts;
                                        Logger.log(
                                            `Max points for assignment ${assignment.dataset.id?.substr(
                                                2
                                            )} is ${pts}`
                                        );
                                    }
                                }
                                //assignment.style.padding = "7px 30px 5px";
                                //assignment.style.textAlign = "center";

                                // kabob menu
                                let commentsContentWrapper = assignment.querySelector(
                                    ".comment-column"
                                )!.firstElementChild as HTMLElement;
                                let kabobMenuButton = createElement("span", ["kabob-menu"], {
                                    textContent: "⠇",
                                    onclick: function (event) {
                                        $(assignment).contextMenu({
                                            x: event.pageX,
                                            y: event.pageY,
                                        });
                                    },
                                });
                                kabobMenuButton.dataset.parentId = assignment.dataset.parentId;

                                let editEnableCheckbox = document.getElementById(
                                    "enable-modify"
                                ) as HTMLInputElement;

                                // not created yet and thus editing disabled, or created the toggle but editing disabled
                                if (!editEnableCheckbox || !editEnableCheckbox.checked) {
                                    kabobMenuButton.classList.add("hidden");
                                }

                                commentsContentWrapper.insertAdjacentElement(
                                    "beforeend",
                                    kabobMenuButton
                                );
                                if (commentsContentWrapper.querySelector(".comment")) {
                                    // Fixes kabob display issues with long comments
                                    commentsContentWrapper.style.display = "flex";
                                    // Fixes kabob display issues with short comments
                                    commentsContentWrapper.style.justifyContent = "space-between";
                                }

                                let createAddAssignmentUi = async function () {
                                    let addAssignmentThing = createAddAssignmentElement(category);

                                    if (assignment.classList.contains("hidden")) {
                                        addAssignmentThing.classList.add("hidden");
                                    }

                                    assignment.insertAdjacentElement(
                                        "afterend",
                                        addAssignmentThing
                                    );
                                    await processAssignment(addAssignmentThing);

                                    return addAssignmentThing;
                                };

                                // add UI for grade virtual editing
                                let gradeWrapper = assignment.querySelector(
                                    ".grade-wrapper"
                                ) as HTMLElement;

                                let checkbox = document.getElementById(
                                    "enable-modify"
                                ) as HTMLInputElement;
                                let gradeAddEditHandler: (() => Promise<void>) | null = null;
                                let editGradeImg = createElement("img", ["grade-edit-indicator"], {
                                    src: chrome.runtime.getURL("imgs/edit-pencil.svg"),
                                    width: 12,
                                    style: `display: ${
                                        checkbox && checkbox.checked ? "unset" : "none"
                                    };`,
                                });
                                editGradeImg.dataset.parentId = assignment.dataset.parentId;
                                if (assignment.classList.contains("grade-add-indicator")) {
                                    // when this is clicked, if the edit was successful, we don't have to worry about making our changes reversible cleanly
                                    // the reversal takes the form of a page refresh once grades have been changed
                                    let hasHandledGradeEdit = false;
                                    gradeAddEditHandler = async function () {
                                        if (hasHandledGradeEdit) {
                                            return;
                                        }

                                        assignment.classList.remove("grade-add-indicator");
                                        assignment.classList.remove("last-row-of-tier");

                                        assignment.classList.add("added-fake-assignment");
                                        trackEvent("button_click", {
                                            id: "create-fake-assignment",
                                            context: "What-If Grades",
                                            legacyTarget: "assignment",
                                            legacyAction: "create-fake",
                                            legacyLabel: "What-If Grades",
                                        });

                                        let assignmentTitle = assignment.getElementsByClassName(
                                            "title"
                                        )[0].firstElementChild! as HTMLElement;
                                        assignmentTitle.textContent =
                                            "Added Assignment (Click to Rename)";
                                        assignmentTitle.classList.add("editable-assignment-name");
                                        assignmentTitle.contentEditable = "true";
                                        assignmentTitle.addEventListener("keydown", event => {
                                            if (event.which === 13) {
                                                (event.target as HTMLElement).blur();
                                                window.getSelection()?.removeAllRanges();
                                            }
                                        });

                                        let newAddAssignmentPlaceholder =
                                            await createAddAssignmentUi();
                                        newAddAssignmentPlaceholder.style.display = "table-row";

                                        hasHandledGradeEdit = true;
                                    };
                                }
                                // edit image
                                editGradeImg.addEventListener(
                                    "click",
                                    createEditListener(
                                        assignment,
                                        gradeWrapper.parentElement!,
                                        category,
                                        period,
                                        gradeAddEditHandler
                                    )
                                );
                                gradeWrapper.appendChild(editGradeImg);
                                // edit text
                                const gradeText =
                                    assignment.querySelector(".awarded-grade") ||
                                    assignment.querySelector(".no-grade");
                                gradeText?.addEventListener(
                                    "click",
                                    createEditListener(
                                        assignment,
                                        gradeWrapper.parentElement!,
                                        category,
                                        period,
                                        gradeAddEditHandler
                                    )
                                );

                                if (
                                    assignment.classList.contains("last-row-of-tier") &&
                                    !assignment.classList.contains("grade-add-indicator")
                                ) {
                                    await createAddAssignmentUi();
                                }
                            };

                            let invalidateCatTotal = false;

                            for (let assignment of assignments) {
                                try {
                                    await processAssignment(assignment);
                                } catch (err: any) {
                                    if (err === "noapikey") {
                                        addEditDisableReason(
                                            {
                                                error: {
                                                    message: err,
                                                    name: err,
                                                    stack: undefined,
                                                    full: JSON.stringify(err),
                                                },
                                                courseId,
                                                course: title.textContent,
                                                assignment: assignment.textContent,
                                            },
                                            false,
                                            true
                                        );
                                    } else {
                                        if (
                                            !assignment.classList.contains("dropped") &&
                                            assignment.querySelector(".missing")
                                        ) {
                                            // consequential failure: our denominator is invalid
                                            invalidateCatTotal = true;
                                            invalidCategories.push(category.dataset.id!);

                                            if ("status" in err && err.status === 403) {
                                                addEditDisableReason(
                                                    {
                                                        error: {
                                                            message: err.error,
                                                            status: err.status,
                                                        },
                                                        courseId,
                                                        course: title.textContent,
                                                        assignment: assignment.textContent,
                                                    },
                                                    true,
                                                    err === "noapikey"
                                                );
                                                continue;
                                            }
                                        }

                                        addEditDisableReason(
                                            {
                                                error: {
                                                    message: err.message,
                                                    name: err.name,
                                                    stack: err.stack,
                                                    full: JSON.stringify(err),
                                                },
                                                courseId,
                                                course: title.textContent,
                                                assignment: assignment.textContent,
                                            },
                                            false,
                                            err === "noapikey"
                                        );
                                    }
                                    Logger.error(
                                        "Error loading assignment for " + courseId + ": ",
                                        assignment,
                                        err
                                    );
                                }
                            }

                            if (assignments.length === 0) {
                                category
                                    .querySelector(".grade-column")
                                    ?.classList.add("grade-column-center");

                                let createAddAssignmentUi = async function () {
                                    let addAssignmentThing = createAddAssignmentElement(category);

                                    category.insertAdjacentElement("afterend", addAssignmentThing);
                                    await processAssignment(addAssignmentThing);

                                    return addAssignmentThing;
                                };

                                let categoryArrow = createElement(
                                    "img",
                                    [
                                        "expandable-icon-grading-report",
                                        "injected-empty-category-expand-icon",
                                    ],
                                    {
                                        src: "/sites/all/themes/schoology_theme/images/expandable-sprite.png",
                                    }
                                );
                                category
                                    .querySelector("th .td-content-wrapper")
                                    ?.prepend(categoryArrow);

                                if (!category.classList.contains("hidden")) {
                                    await createAddAssignmentUi();
                                }
                            }

                            let gradeText =
                                category.querySelector<HTMLElement>(".awarded-grade") ||
                                category.querySelector<HTMLElement>(".no-grade");
                            if (!gradeText) {
                                gradeText = createElement("span", ["awarded-grade"], {
                                    textContent: "—",
                                });
                                category
                                    .querySelector(".grade-column .td-content-wrapper")
                                    ?.appendChild(gradeText);
                                setGradeText(gradeText, sum, max, category);
                                recalculateCategoryScore(category, 0, 0, false, courseId);
                            } else {
                                setGradeText(gradeText, sum, max, category);
                            }

                            gradeText.classList.remove("no-grade");
                            gradeText.classList.add("awarded-grade");

                            if (invalidateCatTotal) {
                                let catMaxElem = gradeText.parentElement!.querySelector(
                                    ".grade-column-center .max-grade"
                                );
                                catMaxElem?.classList.add("max-grade-show-error");
                                invalidatePerTotal = true;
                            }

                            let weightText = category.querySelector(".percentage-contrib");
                            if (addMoreClassTotal) {
                                if (!weightText) {
                                    classPoints += sum;
                                    classTotal += max;
                                    periodPoints += sum;
                                    periodTotal += max;
                                } else if (weightText.textContent == "(100%)") {
                                    classPoints = sum;
                                    classTotal = max;
                                    periodPoints = sum;
                                    periodTotal = max;
                                    addMoreClassTotal = false;
                                } else {
                                    // there are weighted categories that aren't 100%, abandon our calculation
                                    classPoints = 0;
                                    classTotal = 0;
                                    periodPoints = 0;
                                    periodTotal = 0;
                                    addMoreClassTotal = false;
                                }
                            }
                        } catch (err) {
                            addEditDisableReason(
                                {
                                    error: JSON.stringify(err, Object.getOwnPropertyNames(err)),
                                    category: category.textContent,
                                },
                                false,
                                err === "noapikey"
                            );
                        }
                    }

                    let gradeText =
                        period.querySelector<HTMLElement>(".awarded-grade") ||
                        period.querySelector<HTMLElement>(".no-grade");
                    if (!gradeText) {
                        gradeText = createElement("span", ["awarded-grade"], { textContent: "—" });
                        period
                            .querySelector(".grade-column .td-content-wrapper")
                            ?.appendChild(gradeText);
                        setGradeText(
                            gradeText,
                            periodPoints,
                            periodTotal,
                            period,
                            periodTotal === 0
                        );
                        recalculatePeriodScore(period, 0, 0, false, courseId);
                    } else {
                        setGradeText(
                            gradeText,
                            periodPoints,
                            periodTotal,
                            period,
                            periodTotal === 0
                        );
                    }

                    // add weighted indicator to the course section row
                    if (classTotal === 0 && !addMoreClassTotal) {
                        let newElem = createElement(
                            "span",
                            ["splus-weighted-gradebook-indicator"],
                            {
                                textContent: "[Weighted]",
                            }
                        );
                        let periodPercent = period.querySelector("span.percentage-contrib");
                        if (periodPercent) {
                            periodPercent.insertAdjacentElement("beforebegin", newElem);
                        }
                    }

                    if (invalidatePerTotal && classTotal !== 0) {
                        let perMaxElem = gradeText.parentElement!.querySelector(
                            ".grade-column-center .max-grade"
                        );
                        perMaxElem?.classList.add("max-grade-show-error");
                    }
                }

                grade.textContent = courseGrade ? courseGrade.textContent : "—";
                addLetterGrade(grade, courseId);

                // FIXME this is duplicated logic to get the div.gradebook-course given the period row
                let gradebookCourseContainerDiv = periods[0];

                // FIXME null coalesence hack
                // .parentElement.parentElement.parentElement.parentElement
                (function () {
                    for (let i = 0; i < 4; i++) {
                        if (gradebookCourseContainerDiv != null) {
                            gradebookCourseContainerDiv =
                                gradebookCourseContainerDiv.parentElement!;
                        }
                    }
                })();

                // points needed for (next grade) / point buffer from (next lowest grade) logic
                if (
                    gradebookCourseContainerDiv != null &&
                    classTotal != 0 &&
                    periods.length === 1
                ) {
                    let summaryPointsContainer = gradebookCourseContainerDiv.querySelector(
                        ".gradebook-course-grades .summary-course"
                    );

                    let gradeScale = getGradingScale(courseId);
                    let myPercentage = (classPoints / classTotal) * 100;

                    if (summaryPointsContainer) {
                        let gradeScaleSorted = Object.keys(gradeScale)
                            .sort((a, b) => Number.parseFloat(b) - Number.parseFloat(a))
                            .map(function (p) {
                                return { symbol: gradeScale[p], minGrade: +p };
                            });

                        let myGradeIndex = -1;

                        for (let i = 0; i < gradeScaleSorted.length; i++) {
                            if (myPercentage >= gradeScaleSorted[i].minGrade) {
                                myGradeIndex = i;
                                break;
                            }
                        }

                        function createSPlusDisclaimerImage() {
                            // rationale: we want to be very explicit whenever we're modifying anything in the bottom "Course Grade" box
                            // we put our tweaks here in the first place because it makes sense in the UI, and because it doesn't change with grade edits
                            // yet we want to be clear this is unofficial
                            // TODO discuss potentially better alternatives to either this particular or any img in general for making this clarification
                            return createSvgLogo("splus-coursegradebox-taint");
                        }

                        // points needed for next highest grade
                        if (myGradeIndex > 0) {
                            let targetGrade = gradeScaleSorted[myGradeIndex - 1];
                            let targetPts = (targetGrade.minGrade / 100) * classTotal;
                            let neededPts = roundDecimal(targetPts - classPoints, 2);

                            summaryPointsContainer.appendChild(
                                createElement("div", ["total-points-wrapper"], {}, [
                                    createSPlusDisclaimerImage(),
                                    createElement("span", ["total-points-title"], {
                                        textContent: "Points Needed:",
                                    }),
                                    createElement("span", ["total-points-awarded"], {
                                        textContent: neededPts.toString(),
                                    }),
                                    createElement("span", ["total-points-possible"], {
                                        textContent: " for " + targetGrade.symbol,
                                    }),
                                ])
                            );
                        }

                        if (myGradeIndex < gradeScaleSorted.length - 1) {
                            let targetGrade = gradeScaleSorted[myGradeIndex + 1];
                            let targetPts =
                                (gradeScaleSorted[myGradeIndex].minGrade / 100) * classTotal;
                            let bufferPts = roundDecimal(classPoints - targetPts, 2);

                            summaryPointsContainer.appendChild(
                                createElement("div", ["total-points-wrapper"], {}, [
                                    createSPlusDisclaimerImage(),
                                    createElement("span", ["total-points-title"], {
                                        textContent: "Point Buffer:",
                                    }),
                                    createElement("span", ["total-points-awarded"], {
                                        textContent: bufferPts.toString(),
                                    }),
                                    createElement("span", ["total-points-possible"], {
                                        textContent: " from " + targetGrade.symbol,
                                    }),
                                ])
                            );
                        }
                    }
                }

                // Remove (no grading period)
                if (isLAUSD()) {
                    // To avoid making assumptions about how other schools use Schoology
                    for (let i = 1; i < periods.length; i++) {
                        periods[i].remove();
                    }
                }
            })()
        );
    }

    if (
        !document.location.search.includes("past") ||
        document.location.search.split("past=")[1] != "1"
    ) {
        let timeRow = document.getElementById("past-selector");
        let gradeModifLabelFirst = true;
        if (timeRow == null) {
            // basically a verbose null propagation
            // timeRow = document.querySelector(".content-top-upper")?.insertAdjacentElement('afterend', document.createElement("div"))
            let contentTopUpper = document.querySelector(".content-top-upper");
            if (contentTopUpper) {
                timeRow = contentTopUpper.insertAdjacentElement(
                    "afterend",
                    document.createElement("div")
                ) as HTMLDivElement;
            }
        }
        if (timeRow == null) {
            let downloadBtn = document.querySelector("#main-inner .download-grade-wrapper");
            if (downloadBtn) {
                let checkboxHolder = document.createElement("span");
                checkboxHolder.id = "splus-gradeedit-checkbox-holder";
                downloadBtn.prepend(checkboxHolder);

                downloadBtn.classList.add("splus-gradeedit-checkbox-holder-wrapper");

                timeRow = checkboxHolder;
                gradeModifLabelFirst = false;
            }
        }

        let timeRowLabel = createElement(
            "label",
            ["modify-label"],
            {
                htmlFor: "enable-modify",
            },
            [
                createElement("span", [], { textContent: "Enable what-if grades" }),
                createElement(
                    "a",
                    ["splus-grade-help-btn"],
                    {
                        href: `${EXTENSION_WEBSITE}/docs/grades`,
                        target: "_blank",
                    },
                    [createElement("span", ["icon-help"])]
                ),
            ]
        );

        if (gradeModifLabelFirst) {
            timeRow?.appendChild(timeRowLabel);
        }

        timeRow?.appendChild(
            createElement("input", ["splus-track-clicks"], {
                type: "checkbox",
                id: "enable-modify",
                dataset: {
                    splusTrackingContext: "What-If Grades",
                },
                onclick: function () {
                    let normalAssignRClickSelector =
                        ".item-row:not(.dropped):not(.grade-add-indicator):not(.added-fake-assignment)";
                    let addedAssignRClickSelector =
                        ".item-row.added-fake-assignment:not(.dropped):not(.grade-add-indicator)";
                    let droppedAssignRClickSelector = ".item-row.dropped:not(.grade-add-indicator)";

                    // any state change when editing has been disabled
                    if (Settings.ApiStatus.value === "denied") {
                        if (
                            confirm(
                                "This feature requires access to your Schoology API Key, which you have denied. Would you like to enable access?"
                            )
                        ) {
                            trackEvent("button_click", {
                                id: "api-denied-popup",
                                context: "What-If Grades",
                                value: "go-to-enabled",
                                legacyTarget: "api-denied-popup",
                                legacyAction: "go-to-enable",
                                legacyLabel: "What-If Grades",
                            });
                            location.pathname = "/api";
                        } else {
                            trackEvent("button_click", {
                                id: "api-denied-popup",
                                context: "What-If Grades",
                                value: "keep-disabled",
                                legacyTarget: "api-denied-popup",
                                legacyAction: "keep-disabled",
                                legacyLabel: "What-If Grades",
                            });
                        }
                    } else if (Settings.ApiStatus.value === "blocked") {
                        if (
                            confirm(
                                "This feature requires access to your Schoology API Key, which has unfortunately been blocked by your school. If you think this might not be right, you can click OK to try and enable access again."
                            )
                        ) {
                            trackEvent("button_click", {
                                id: "api-blocked-popup",
                                context: "What-If Grades",
                                value: "go-to-enable",
                                legacyTarget: "api-blocked-popup",
                                legacyAction: "go-to-enable",
                                legacyLabel: "What-If Grades",
                            });
                            location.pathname = "/api";
                        } else {
                            trackEvent("button_click", {
                                id: "api-blocked-popup",
                                context: "What-If Grades",
                                value: "keep-blocked",
                                legacyTarget: "api-blocked-popup",
                                legacyAction: "keep-blocked",
                                legacyLabel: "What-If Grades",
                            });
                        }
                    } else if (editDisableReason && editDisableReason.causedByNoApiKey) {
                        location.pathname = "/api";
                    } else if (editDisableReason && !editDisableReason.allCausedBy403) {
                        Logger.error("Editing disabled due to error", editDisableReason);

                        if (
                            confirm(
                                `Grade editing has been disabled due to an error. If you are trying to use What If Grades on the grade report page, try going to an individual class gradebook instead. If you are consistently getting this error, please reach out to the ${EXTENSION_NAME} Discord server.`
                            )
                        ) {
                            // window.open(`${BUG_REPORT_FORM_LINK}${encodeURIComponent(JSON.stringify(editDisableReason))}`, "_blank");
                        }

                        let enableModify = document.getElementById(
                            "enable-modify"
                        ) as HTMLInputElement | null;
                        if (enableModify) enableModify.checked = false;
                    }
                    // enabling editing
                    else if (
                        (document.getElementById("enable-modify") as HTMLInputElement | null)
                            ?.checked
                    ) {
                        if (editDisableReason && editDisableReason.allCausedBy403) {
                            if (
                                confirm(
                                    "WARNING!!!\n\nYou have one or more missing assignments for which the total points are unknown due to restrictions put in place by your teacher. Grade editing may work in some categories if this is a weighted gradebook, however it will be disabled in others."
                                )
                            ) {
                                // window.open(`${BUG_REPORT_FORM_LINK}${encodeURIComponent(JSON.stringify(editDisableReason))}`, "_blank");
                            }
                        }

                        for (let edit of document.getElementsByClassName(
                            "grade-edit-indicator"
                        ) as HTMLCollectionOf<HTMLElement>) {
                            if (invalidCategories.includes(edit.dataset.parentId!)) continue;

                            edit.style.display = "unset";
                        }
                        for (let edit of document.getElementsByClassName(
                            "grade-add-indicator"
                        ) as HTMLCollectionOf<HTMLElement>) {
                            if (invalidCategories.includes(edit.dataset.parentId!)) continue;

                            edit.style.display = "table-row";
                            if (
                                edit.previousElementSibling?.classList.contains("item-row") &&
                                edit.previousElementSibling.classList.contains("last-row-of-tier")
                            ) {
                                edit.previousElementSibling.classList.remove("last-row-of-tier");
                            }
                        }
                        for (let arrow of document.getElementsByClassName(
                            "injected-empty-category-expand-icon"
                        ) as HTMLCollectionOf<HTMLElement>) {
                            arrow.style.visibility = "visible";
                        }

                        let calculateMinimumGrade = function (
                            element: HTMLElement,
                            desiredGrade: number,
                            courseId: string
                        ) {
                            let gradeColContentWrap =
                                element.querySelector(".grade-wrapper")?.parentElement;

                            if (!gradeColContentWrap) {
                                Logger.error(
                                    "Could not calculate minimum grade: grade wrapper element missing",
                                    element
                                );
                                return;
                            }

                            removeExceptionState(element, gradeColContentWrap);

                            // TODO refactor the grade extraction
                            let noGradeElement = gradeColContentWrap.querySelector(".no-grade");
                            let score =
                                gradeColContentWrap.querySelector<HTMLElement>(".rounded-grade") ||
                                gradeColContentWrap.querySelector<HTMLElement>(
                                    ".rubric-grade-value"
                                ) ||
                                gradeColContentWrap.querySelector<HTMLElement>(".no-grade");
                            let maxGrade = gradeColContentWrap.querySelector(".max-grade");
                            let scoreVal = 0;
                            let maxVal = 0;
                            let noGrade = noGradeElement == score;

                            if (score && maxGrade) {
                                scoreVal = Number.parseFloat(score.textContent!);
                                maxVal = Number.parseFloat(maxGrade.textContent!.substring(3));
                            } else if (
                                element.querySelector(".exception-icon.missing") &&
                                maxGrade
                            ) {
                                let scoreValues = maxGrade.textContent!.split("/");
                                scoreVal = Number.parseFloat(scoreValues[0]);
                                maxVal = Number.parseFloat(scoreValues[1]);
                            }

                            if (Number.isNaN(scoreVal)) {
                                scoreVal = 0;
                                score?.classList?.add("rounded-grade");
                                score?.classList?.remove("no-grade");
                            }

                            if (
                                !gradeColContentWrap.querySelector(
                                    ".modified-score-percent-warning"
                                )
                            ) {
                                //gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0].style.paddingRight = "0";
                                gradeColContentWrap.appendChild(generateScoreModifyWarning());
                                gradesModified = true;
                            }

                            let catId = element.dataset.parentId;
                            let catRow = Array.from(
                                element.parentElement!.getElementsByTagName(
                                    "tr"
                                ) as HTMLCollectionOf<HTMLTableRowElement>
                            ).find(e => e.dataset.id == catId)!;

                            let perId = catRow.dataset.parentId;
                            let perRow = Array.from(
                                element.parentElement!.getElementsByTagName(
                                    "tr"
                                ) as HTMLCollectionOf<HTMLTableRowElement>
                            ).find(e => e.dataset.id == perId)!;

                            let deltaScore = 0;

                            // TODO refactor
                            // if the period (course) has a point value (unweighted), just work from there
                            let awardedPeriodPoints = perRow?.querySelector(".grade-column-center");
                            if (
                                awardedPeriodPoints &&
                                awardedPeriodPoints.textContent!.trim().length !== 0
                            ) {
                                // awarded grade in our constructed element contains both rounded and max
                                let perScoreElem =
                                    awardedPeriodPoints.querySelector(".rounded-grade");
                                let perMaxElem =
                                    awardedPeriodPoints.querySelector<HTMLElement>(".max-grade");
                                let perScore = Number.parseFloat(perScoreElem?.textContent!);
                                let perMax = Number.parseFloat(
                                    perMaxElem?.textContent!.substring(3)!
                                );

                                if (noGrade) {
                                    perMax += maxVal;
                                }

                                // (perScore + x) / perMax = desiredGrade
                                // solve for x:
                                deltaScore = desiredGrade * perMax - perScore;
                            } else {
                                // weighted

                                // get this out of the way so it doesn't ruin later calculations
                                if (noGrade) {
                                    recalculateCategoryScore(catRow, 0, maxVal, true, courseId);
                                    recalculatePeriodScore(perRow, 0, maxVal, true, courseId);
                                    noGrade = false;
                                }

                                // get category score and category weight
                                let awardedCategoryPoints =
                                    catRow.querySelector(".rounded-grade")!.parentNode!;
                                let catScoreElem =
                                    awardedCategoryPoints.querySelector(".rounded-grade")!;
                                let catMaxElem = awardedCategoryPoints.querySelector(".max-grade")!;
                                let catScore = Number.parseFloat(catScoreElem.textContent!);
                                let catMax = Number.parseFloat(
                                    catMaxElem.textContent!.substring(3)
                                );

                                if (noGrade) {
                                    catMax += maxVal;
                                }

                                // TODO refactor
                                let total = 0;
                                let totalPercentWeight = 0;
                                let catWeight = 0; // 0 to 1
                                for (let category of perRow.parentElement?.querySelectorAll<HTMLElement>(
                                    `.category-row[data-parent-id="${perRow.dataset.id}"]`
                                ) ?? []) {
                                    let weightPercentElement =
                                        category.getElementsByClassName("percentage-contrib")[0];
                                    if (!weightPercentElement) {
                                        continue;
                                    }

                                    let weightPercent = weightPercentElement.textContent!;
                                    let col =
                                        category.getElementsByClassName("grade-column-right")[0];

                                    let colMatch = col
                                        ? col.textContent!.match(/(\d+\.?\d*)%/)
                                        : null;

                                    if (colMatch) {
                                        let scorePercent = Number.parseFloat(colMatch[1]);
                                        if (
                                            (scorePercent || scorePercent === 0) &&
                                            !Number.isNaN(scorePercent)
                                        ) {
                                            total +=
                                                (Number.parseFloat(weightPercent.slice(1, -2)) /
                                                    100) *
                                                scorePercent;
                                            let weight = Number.parseFloat(
                                                weightPercent.slice(1, -2)
                                            );
                                            totalPercentWeight += weight;
                                            if (category.dataset.id == catId) {
                                                catWeight = weight / 100;
                                            }
                                        }
                                    }
                                }

                                totalPercentWeight /= 100;

                                // if only some categories have assignments, adjust the total accordingly
                                // if weights are more than 100, this assumes that it's correct as intended (e.c.), I won't mess with it
                                if (totalPercentWeight > 0 && totalPercentWeight < 1) {
                                    // some categories are specified, but weights don't quite add to 100
                                    // scale up known grades
                                    total /= totalPercentWeight;
                                    catWeight /= totalPercentWeight;
                                    // epsilon because floating point
                                } else if (totalPercentWeight < 0.00001) {
                                    total = 100;
                                }

                                // normalize total: 0 to 1+ [e.c.], total course score
                                total /= 100;

                                // calculate the worth in percentage points of one point in our category
                                let catPointWorth = catWeight / catMax;

                                // total + (catPointWorth*deltaScore) = desiredGrade
                                // solve:
                                deltaScore = (desiredGrade - total) / catPointWorth;
                            }

                            if (deltaScore < -scoreVal) {
                                deltaScore = -scoreVal;
                            }

                            // ?: Using Math.ceil ensures finalGrade >= desiredGrade when possible
                            deltaScore = Math.ceil(deltaScore * 100) / 100;

                            const finalGrade = Math.round((scoreVal + deltaScore) * 100) / 100;
                            if (score) {
                                // TODO refactor: we already have our DOM elements
                                score.title = finalGrade.toString();
                                score.textContent = finalGrade.toString();
                            }

                            prepareScoredAssignmentGrade(
                                element.querySelector(
                                    ".injected-assignment-percent"
                                ) as HTMLElement,
                                finalGrade,
                                maxVal
                            );
                            recalculateCategoryScore(
                                catRow,
                                deltaScore,
                                noGrade ? maxVal : 0,
                                true,
                                courseId
                            );
                            recalculatePeriodScore(
                                perRow,
                                deltaScore,
                                noGrade ? maxVal : 0,
                                true,
                                courseId
                            );
                        };

                        let dropGradeThis = function (this: HTMLElement[]) {
                            trackEvent("context_menu_click", {
                                id: "Drop",
                                context: "What-If Grades",
                                legacyTarget: "assignment",
                                legacyAction: "drop",
                                legacyLabel: "What-If Grades",
                            });
                            this[0].classList.add("dropped");
                            // alter grade
                            let gradeColContentWrap =
                                this[0].querySelector(".grade-wrapper")?.parentElement;
                            // TODO refactor the grade extraction
                            let score =
                                gradeColContentWrap?.querySelector(".rounded-grade") ||
                                gradeColContentWrap?.querySelector(".rubric-grade-value");
                            let maxGrade = gradeColContentWrap?.querySelector(".max-grade");
                            let scoreVal = 0;
                            let maxVal = 0;

                            if (score && maxGrade) {
                                scoreVal = Number.parseFloat(score.textContent!);
                                maxVal = Number.parseFloat(maxGrade.textContent!.substring(3));
                            } else if (
                                this[0].classList.contains("contains-exception") &&
                                maxGrade
                            ) {
                                let scoreValues = maxGrade.textContent!.split("/");
                                scoreVal = Number.parseFloat(scoreValues[0]);
                                maxVal = Number.parseFloat(scoreValues[1]);
                                if (Number.isNaN(scoreVal)) {
                                    // exception states are 0 or -, always
                                    // this might be NaN because it's parsing a space
                                    scoreVal = 0;
                                }
                                if (!this[0].querySelector(".exception-icon.missing")) {
                                    // non-missing exception means uncounted (incomplete or excused)
                                    // set scores to 0 so we make no mathematical change
                                    scoreVal = 0;
                                    maxVal = 0;
                                }
                            }

                            if (
                                gradeColContentWrap &&
                                !gradeColContentWrap.querySelector(
                                    ".modified-score-percent-warning"
                                )
                            ) {
                                //gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0].style.paddingRight = "0";
                                gradeColContentWrap.appendChild(generateScoreModifyWarning());
                                gradesModified = true;
                            }

                            let catId = this[0].dataset.parentId;
                            let catRow = Array.prototype.find.call(
                                this[0].parentElement?.getElementsByTagName("tr"),
                                e => e.dataset.id == catId
                            );

                            let perId = catRow.dataset.parentId;
                            let perRow = Array.prototype.find.call(
                                this[0].parentElement?.getElementsByTagName("tr"),
                                e => e.dataset.id == perId
                            );

                            let courseId = perRow.dataset.parentId;

                            recalculateCategoryScore(catRow, -scoreVal, -maxVal, true, courseId);
                            recalculatePeriodScore(perRow, -scoreVal, -maxVal, true, courseId);
                        };

                        let undroppedAssignItemSet = {
                            drop: {
                                name: "Drop",
                                callback: dropGradeThis,
                            },
                            delete: {
                                name: "Delete",
                                callback: function (this: HTMLElement[]) {
                                    dropGradeThis.bind(this)();
                                    // shouldn't need to worry about any last-row-of-tier stuff because this will always be followed by an Add Assignment indicator
                                    this[0].remove();
                                },
                            },
                            separator: "-----",
                            calculateMinGrade: {
                                name: "Calculate Minimum Grade",
                                callback: function (this: HTMLElement[], key: any, opt: any) {
                                    // TODO refactor grade extraction
                                    // get course letter grade
                                    let catId = this[0].dataset.parentId;
                                    let catRow = Array.from(
                                        this[0].parentElement!.getElementsByTagName("tr")
                                    ).find(e => e.dataset.id == catId)!;
                                    let perId = catRow.dataset.parentId;
                                    let perRow = Array.from(
                                        this[0].parentElement!.getElementsByTagName("tr")
                                    ).find(e => e.dataset.id == perId)!;

                                    // TODO refactor
                                    // (this) tr -> tbody -> table -> div.gradebook-course-grades -> relevant div
                                    let courseId = Number.parseInt(
                                        /course-(\d+)$/.exec(
                                            this[0].parentElement!.parentElement!.parentElement!
                                                .parentElement!.id
                                        )![1]
                                    ).toString();

                                    let gradingScale = getGradingScale(courseId);

                                    let courseGrade = getLetterGrade(
                                        gradingScale,
                                        Number.parseFloat(
                                            /\d+(\.\d+)%/
                                                .exec(
                                                    perRow.querySelector(".grade-column-right")!
                                                        .firstElementChild!.textContent!
                                                )![0]
                                                .slice(0, -1)
                                        )
                                    );

                                    let desiredPercentage = 0.9;

                                    // letter to percent - "in" for property enumeration
                                    for (let gradeValue in gradingScale) {
                                        if (gradingScale[gradeValue] == courseGrade) {
                                            desiredPercentage = Number.parseFloat(gradeValue) / 100;
                                            break;
                                        }
                                    }

                                    trackEvent("context_menu_click", {
                                        id: "Calculate Minimum Grade",
                                        context: "What-If Grades",
                                        legacyTarget: "assignment",
                                        legacyAction: "calc-min",
                                        legacyLabel: "What-If Grades",
                                    });
                                    calculateMinimumGrade(this[0], desiredPercentage, courseId);
                                },
                                items: {},
                            },
                        };

                        let undroppedAssignContextMenuItems = {
                            drop: undroppedAssignItemSet.drop,
                            separator: undroppedAssignItemSet.separator,
                            calculateMinGrade: undroppedAssignItemSet.calculateMinGrade,
                        };

                        for (let courseElement of document.getElementsByClassName(
                            "gradebook-course"
                        )) {
                            let baseContextMenuObject: Partial<JQueryContextMenuOptions> = {};
                            let calcMinFor: Record<string, any> = {};
                            baseContextMenuObject.items = {};
                            Object.assign(
                                baseContextMenuObject.items,
                                undroppedAssignContextMenuItems
                            );
                            baseContextMenuObject.items.calculateMinGrade = {};
                            Object.assign(
                                baseContextMenuObject.items.calculateMinGrade,
                                undroppedAssignContextMenuItems.calculateMinGrade
                            );
                            baseContextMenuObject.items.calculateMinGrade.items = calcMinFor;

                            baseContextMenuObject.selector = "#" + courseElement.id + " ";

                            let courseId = /\d+$/.exec(courseElement.id)![0];

                            // TODO if grade scale is updated while this page is loaded (i.e. after this code runs) what to do
                            let gradingScale = getGradingScale(courseId);

                            for (let gradeValue of Object.keys(gradingScale).sort(
                                (a, b) => Number.parseFloat(b) - Number.parseFloat(a)
                            )) {
                                let letterGrade = gradingScale[gradeValue];
                                calcMinFor["calculateMinGradeFor" + gradeValue] = {
                                    name: "For " + letterGrade + " (" + gradeValue + "%)",
                                    callback: function (this: HTMLElement[], key: any, opt: any) {
                                        trackEvent("context_menu_click", {
                                            id: "Calculate Minimum Grade For...",
                                            context: "What-If Grades",
                                            value: letterGrade,
                                            legacyTarget: "assignment",
                                            legacyAction: `calc-min-for-${letterGrade}`,
                                            legacyLabel: "What-If Grades",
                                        });
                                        calculateMinimumGrade(
                                            this[0],
                                            Number.parseFloat(gradeValue) / 100,
                                            courseId
                                        );
                                    },
                                };
                            }

                            calcMinFor.separator1 = "-----";

                            calcMinFor.calculateMinGradeForCustom = {
                                name: "For Custom Value",
                                callback: function (this: HTMLElement[], key: any, opt: any) {
                                    trackEvent("context_menu_click", {
                                        id: "Calculate Minimum Grade For Custom Value",
                                        context: "What-If Grades",
                                        value: "custom-value",
                                        legacyTarget: "assignment",
                                        legacyAction: "calc-min-for-custom",
                                        legacyLabel: "What-If Grades",
                                    });

                                    let value = prompt(
                                        "Please enter a grade to calculate for (a number on the scale of 0 to 100)"
                                    );

                                    if (
                                        value !== null &&
                                        !Number.isNaN(value) &&
                                        !Number.isNaN(Number.parseFloat(value))
                                    ) {
                                        // if a number, calculate
                                        calculateMinimumGrade(
                                            this[0],
                                            Number.parseFloat(value) / 100,
                                            courseId
                                        );
                                    } else {
                                        alert("Invalid number");
                                    }
                                },
                            };

                            calcMinFor.separator2 = "-----";
                            calcMinFor.courseOptions = {
                                name: "Change Grade Boundaries",
                                callback: function () {
                                    let courseElem = this[0].closest(".gradebook-course");
                                    let titleElem = SINGLE_COURSE
                                        ? document.querySelector(".page-title")
                                        : courseElem.querySelector(".gradebook-course-title");
                                    trackEvent("context_menu_click", {
                                        id: "Change Grade Boundaries",
                                        context: "What-If Grades",
                                        legacyTarget: "assignment",
                                        legacyAction: "change-boundaries",
                                        legacyLabel: "What-If Grades",
                                    });
                                    Modal.openModal("course-settings-modal", {
                                        courseId: courseElem.id.match(/\d+/)[0],
                                        courseName: titleElem.querySelector("a span:nth-child(3)")
                                            ? titleElem.querySelector("a span:nth-child(2)")
                                                  .textContent
                                            : titleElem.innerText.split("\n")[0],
                                    });
                                },
                            };

                            let normalContextMenuObject = Object.assign({}, baseContextMenuObject);
                            normalContextMenuObject.selector += normalAssignRClickSelector;

                            let addedContextMenuObject = Object.assign({}, baseContextMenuObject);
                            addedContextMenuObject.selector += addedAssignRClickSelector;
                            // replace drop with delete
                            addedContextMenuObject.items = Object.assign(
                                {},
                                baseContextMenuObject.items
                            );
                            addedContextMenuObject.items.drop = undroppedAssignItemSet.delete;

                            $.contextMenu(normalContextMenuObject as JQueryContextMenuOptions);
                            $.contextMenu(addedContextMenuObject as JQueryContextMenuOptions);
                        }

                        $.contextMenu({
                            selector: droppedAssignRClickSelector,
                            items: {
                                undrop: {
                                    name: "Undrop",
                                    callback: function (this: HTMLElement[], key: any, opt: any) {
                                        trackEvent("context_menu_click", {
                                            id: "Undrop",
                                            context: "What-If Grades",
                                            legacyTarget: "assignment",
                                            legacyAction: "undrop",
                                            legacyLabel: "What-If Grades",
                                        });
                                        this[0].classList.remove("dropped");
                                        // alter grade
                                        let gradeColContentWrap =
                                            this[0].querySelector(".grade-wrapper")!.parentElement!;
                                        removeExceptionState(this[0], gradeColContentWrap);
                                        // TODO refactor the grade extraction
                                        let score =
                                            gradeColContentWrap.querySelector(".rounded-grade") ||
                                            gradeColContentWrap.querySelector(
                                                ".rubric-grade-value"
                                            );
                                        let maxGrade =
                                            gradeColContentWrap.querySelector(".max-grade");
                                        let scoreVal = 0;
                                        let maxVal = 0;

                                        if (score && maxGrade) {
                                            scoreVal = Number.parseFloat(score.textContent!);
                                            maxVal = Number.parseFloat(
                                                maxGrade.textContent!.substring(3)
                                            );
                                        } else if (
                                            maxGrade &&
                                            this[0].querySelector(".exception-icon.missing")
                                        ) {
                                            let scoreValues = maxGrade.textContent!.split("/");
                                            scoreVal = Number.parseFloat(scoreValues[0]);
                                            maxVal = Number.parseFloat(scoreValues[1]);
                                        }

                                        if (
                                            !gradeColContentWrap.querySelector(
                                                ".modified-score-percent-warning"
                                            )
                                        ) {
                                            //gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0].style.paddingRight = "0";
                                            gradeColContentWrap.appendChild(
                                                generateScoreModifyWarning()
                                            );
                                            gradesModified = true;
                                        }

                                        let catId = this[0].dataset.parentId;
                                        let catRow = Array.from(
                                            this[0].parentElement!.getElementsByTagName("tr")
                                        ).find((e: HTMLElement) => e.dataset.id == catId)!;

                                        let perId = catRow.dataset.parentId;
                                        let perRow = Array.from(
                                            this[0].parentElement!.getElementsByTagName("tr")
                                        ).find((e: HTMLElement) => e.dataset.id == perId)!;

                                        let courseId = perRow.dataset.parentId;

                                        recalculateCategoryScore(
                                            catRow,
                                            scoreVal,
                                            maxVal,
                                            true,
                                            courseId
                                        );
                                        recalculatePeriodScore(
                                            perRow,
                                            scoreVal,
                                            maxVal,
                                            true,
                                            courseId
                                        );
                                    },
                                },
                            },
                        });

                        for (let kabob of document.getElementsByClassName(
                            "kabob-menu"
                        ) as HTMLCollectionOf<HTMLElement>) {
                            if (invalidCategories.includes(kabob.dataset.parentId!)) continue;

                            kabob.classList.remove("hidden");
                        }
                        // uncheck the grades modify box without having modified grades
                    } else if (!gradesModified) {
                        for (let edit of document.getElementsByClassName(
                            "grade-edit-indicator"
                        ) as HTMLCollectionOf<HTMLElement>) {
                            edit.style.display = "none";
                        }
                        for (let edit of document.getElementsByClassName(
                            "grade-add-indicator"
                        ) as HTMLCollectionOf<HTMLElement>) {
                            edit.style.display = "none";
                            if (
                                edit.previousElementSibling!.classList.contains("item-row") &&
                                !edit.previousElementSibling!.classList.contains("last-row-of-tier")
                            ) {
                                edit.previousElementSibling!.classList.add("last-row-of-tier");
                            }
                        }
                        for (let kabob of document.getElementsByClassName("kabob-menu")) {
                            kabob.classList.add("hidden");
                        }
                        for (let courseElement of document.getElementsByClassName(
                            "gradebook-course"
                        )) {
                            $.contextMenu(
                                "destroy",
                                "#" + courseElement.id + " " + normalAssignRClickSelector
                            );
                            $.contextMenu(
                                "destroy",
                                "#" + courseElement.id + " " + addedAssignRClickSelector
                            );
                        }
                        for (let arrow of document.getElementsByClassName(
                            "injected-empty-category-expand-icon"
                        ) as HTMLCollectionOf<HTMLElement>) {
                            arrow.style.visibility = "hidden";
                        }
                        $.contextMenu("destroy", droppedAssignRClickSelector);
                        // uncheck the edit checkbox, with modified grades existing: prompt: does user confirm?
                    } else if (
                        confirm(
                            "Disabling grade edits now will reload the page and erase all existing modified grades. Proceed?"
                        )
                    ) {
                        // not going to try to undo any grade modifications
                        document.location.reload();
                        // attempted to disable grade editing but backed out of confirmation prompt
                    } else {
                        (document.getElementById("enable-modify") as HTMLInputElement).checked =
                            true;
                    }
                },
            })
        );

        if (!gradeModifLabelFirst) {
            timeRow?.appendChild(timeRowLabel);
        }
    }

    for (let courseTask of courseLoadTasks) {
        await courseTask;
    }

    if (
        !document.location.search.includes("past") ||
        document.location.search.split("past=")[1] != "1"
    ) {
        if (Settings.CourseOrderMethod.value == "period") {
            for (let course of coursesByPeriod) {
                if (course) {
                    course.parentElement!.appendChild(course);
                }
            }
        }
    }

    function getLetterGrade(gradingScale: Record<string, string>, percentage: number): string {
        let sorted = Object.keys(gradingScale).sort(
            (a, b) => Number.parseFloat(b) - Number.parseFloat(a)
        );
        for (let s of sorted) {
            if (percentage >= Number.parseInt(s)) {
                return gradingScale[s];
            }
        }
        return "?";
    }

    function queueNonenteredAssignment(
        assignment: HTMLElement,
        courseId: string,
        period: HTMLElement,
        category: HTMLElement
    ) {
        let noGrade: HTMLElement | null = assignment.getElementsByClassName(
            "no-grade"
        )[0] as HTMLElement;

        // awarded grade present for assignments with letter-grade-only scores (numeric value hidden)
        let awardedGrade = assignment.getElementsByClassName("awarded-grade")[0];
        let letterGradeOnly = false;

        if (!noGrade && awardedGrade) {
            Logger.log(
                `Found assignment (ID ${assignment.dataset.id?.substr(
                    2
                )}) with only letter-grade showing`
            );
            letterGradeOnly = true;

            awardedGrade.textContent += " ";
            noGrade = document.createElement("span");
            noGrade.classList.add("no-grade");
            noGrade.textContent = "—";
            awardedGrade.insertAdjacentElement("afterend", noGrade);
        }

        if (!noGrade) {
            Logger.log(
                `Error loading potentially nonentered assignment with ID ${assignment.dataset.id?.substr(
                    2
                )}`
            );
            return;
        }

        if (noGrade.parentElement?.classList.contains("exception-grade-wrapper")) {
            noGrade.remove();
            assignment.classList.add("contains-exception");
            // an exception case
            // now we just have to be careful to avoid double-counting
            noGrade = assignment.querySelector<HTMLElement>(".exception .exception-icon");
            if (noGrade) {
                // the text gets in the way
                let exceptionDesc = assignment.querySelector(".exception .exception-text");
                noGrade.title = exceptionDesc?.textContent ?? "<ERR>";
                exceptionDesc?.remove();
            }
        }

        if (noGrade && assignment.dataset.id) {
            // do this while the other operation is happening so we don't block the page load
            // don't block on it

            let maxGrade = document.createElement("span");
            maxGrade.classList.add("max-grade");
            maxGrade.classList.add("no-grade");
            maxGrade.textContent = " / —";
            noGrade.insertAdjacentElement("afterend", maxGrade);

            let f = async () => {
                let domAssignId = assignment.dataset.id?.substr(2);
                Logger.log(`Fetching max points for (nonentered) assignment ${domAssignId}`);

                let response: Response | null = null;
                let firstTryError: any = null;

                try {
                    response = await fetchApi(`sections/${courseId}/assignments/${domAssignId}`);
                } catch (err) {
                    firstTryError = err;
                }

                if (response && !response.ok) {
                    firstTryError = { status: response.status, error: response.statusText };
                } else if (response) {
                    try {
                        let json = await response.json();

                        if (json && json.max_points !== undefined) {
                            // success case
                            // note; even if maxGrade is removed from the DOM, this will still work
                            maxGrade.textContent = " / " + json.max_points;
                            maxGrade.classList.remove("no-grade");
                        } else {
                            firstTryError = "JSON returned without max points";
                        }
                    } catch (err) {
                        firstTryError = err;
                    }
                } else if (!firstTryError) {
                    firstTryError + "Unknown error fetching API response";
                }

                if (!firstTryError && !letterGradeOnly) return;

                if (firstTryError) {
                    Logger.log(
                        `Error directly fetching max points for (nonentered) assignment ${domAssignId}, reverting to list-search`
                    );
                }
                if (letterGradeOnly) {
                    Logger.log(
                        `Finding grade for letter-grade-only assignment ${domAssignId} from list-search`
                    );
                }

                try {
                    response = await fetchApi(`users/${getUserId()}/grades?section_id=${courseId}`);
                    if (!response.ok) {
                        throw { status: response.status, error: response.statusText };
                    }
                    let json = await response.json();

                    if (json && json.section.length > 0) {
                        // success case
                        let jsonAssignment = json.section[0].period
                            .flatMap((p: any) => p.assignment)
                            .filter(
                                (x: any) => x.assignment_id == Number.parseInt(domAssignId!)
                            )[0];

                        if (letterGradeOnly && jsonAssignment.grade !== undefined) {
                            let numericGradeValueSpan = createElement(
                                "span",
                                ["numeric-grade-value"],
                                {},
                                [
                                    createElement("span", ["rounded-grade"], {
                                        title: String(jsonAssignment.grade),
                                        textContent: String(jsonAssignment.grade),
                                    }),
                                ]
                            );
                            awardedGrade.insertAdjacentElement("beforeend", numericGradeValueSpan);
                            if (noGrade) noGrade.outerHTML = "";

                            recalculateCategoryScore(
                                category,
                                Number.parseFloat(jsonAssignment.grade),
                                Number.parseFloat(jsonAssignment.max_points),
                                false,
                                courseId
                            );
                            recalculatePeriodScore(
                                period,
                                Number.parseFloat(jsonAssignment.grade),
                                Number.parseFloat(jsonAssignment.max_points),
                                false,
                                courseId
                            );
                        }

                        if (firstTryError) {
                            // note; even if maxGrade is removed from the DOM, this will still work
                            maxGrade.textContent = " / " + jsonAssignment.max_points;
                            maxGrade.classList.remove("no-grade");
                        }
                    } else {
                        if (letterGradeOnly) {
                            addEditDisableReason(
                                "Letter grade only assignment can't load point values",
                                true,
                                false
                            );
                            invalidCategories.push(category.dataset.id!);
                        }

                        throw "List search failed to obtain meaningful response";
                    }
                } catch (err) {
                    throw { listSearchErr: err, firstTryError: firstTryError };
                }
            };
            fetchQueue.push([f, 0]);
        }

        // td-content-wrapper
        noGrade?.parentElement?.appendChild(document.createElement("br"));
        let injectedPercent = createElement(
            "span",
            ["percentage-grade", "injected-assignment-percent"],
            { textContent: "N/A" }
        );
        noGrade?.parentElement?.appendChild(injectedPercent);
    }

    function prepareScoredAssignmentGrade(spanPercent: HTMLElement, score: number, max: number) {
        spanPercent.textContent = max === 0 ? "EC" : `${Math.round((score * 100) / max)}%`;
        spanPercent.title = max === 0 ? "Extra Credit" : `${(score * 100) / max}%`;
        if (!spanPercent.classList.contains("max-grade")) {
            spanPercent.classList.add("max-grade");
        }
        if (!spanPercent.classList.contains("injected-assignment-percent")) {
            spanPercent.classList.add("injected-assignment-percent");
        }
    }

    function setGradeText(
        gradeElement: HTMLElement | null,
        sum: number,
        max: number,
        row: HTMLElement,
        doNotDisplay: boolean = false
    ) {
        if (!gradeElement) return;

        let courseId = (row.parentElement!.firstElementChild as HTMLElement).dataset.id!;
        // currently there exists a letter grade here, we want to put a point score here and move the letter grade
        let text = gradeElement.parentElement!.textContent!;
        gradeElement.parentElement!.classList.add("grade-column-center");
        //gradeElement.parentElement.style.textAlign = "center";
        //gradeElement.parentElement.style.paddingRight = "30px";
        gradeElement.innerHTML = "";
        // create the elements for our point score
        gradeElement.appendChild(
            createElement("span", ["rounded-grade"], {
                textContent: doNotDisplay ? "" : (Math.round(sum * 100) / 100).toString(),
            })
        );
        gradeElement.appendChild(
            createElement("span", ["max-grade"], {
                textContent: doNotDisplay ? "" : ` / ${Math.round(max * 100) / 100}`,
            })
        );
        // move the letter grade over to the right
        let span = row.querySelector<HTMLElement>(".comment-column")!.firstChild!;
        span.textContent = text;

        addLetterGrade(span as HTMLElement, courseId);

        // restyle the right hand side
        span.parentElement?.classList.remove("comment-column");
        span.parentElement?.classList.add("grade-column");
        span.parentElement?.classList.add("grade-column-right");
        //span.style.cssFloat = "right"; //maybe remove
        //span.style.color = "#3aa406";
        //span.style.fontWeight = "bold";
    }

    function addLetterGrade(elem: HTMLElement, courseId: string) {
        let gradingScale = getGradingScale(courseId);
        if (
            Settings.CustomGradingScales.value != "disabled" &&
            elem.textContent!.match(/^\d+\.?\d*%/) !== null
        ) {
            let percent = Number.parseFloat(
                elem.textContent!.substr(0, elem.textContent!.length - 1)
            );
            let letterGrade = getLetterGrade(gradingScale, percent);
            elem.textContent = `${letterGrade} (${percent}%)`;
            elem.title = `Letter grade calculated by ${EXTENSION_NAME} using the following grading scale:\n${Object.keys(
                gradingScale
            )
                .sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b))
                .reverse()
                .map(x => `${gradingScale[x]}: ${x}%`)
                .join(
                    "\n"
                )}\nTo change this grading scale, find 'Course Options' on the page for this course`;
        }
    }

    function generateScoreModifyWarning() {
        return createElement("img", ["modified-score-percent-warning"], {
            src: chrome.runtime.getURL("imgs/exclamation-mark.svg"),
            title: "This grade has been modified from its true value.",
        });
    }

    function recalculateCategoryScore(
        catRow: HTMLElement,
        deltaPoints: number,
        deltaMax: number,
        warn = true,
        courseId?: string
    ) {
        // category always has a numeric score, unlike period
        // awarded grade in our constructed element contains both rounded and max
        let awardedCategoryPoints = catRow.querySelector(".rounded-grade")!.parentNode!;
        let catScoreElem = awardedCategoryPoints.querySelector(".rounded-grade")!;
        let catMaxElem = awardedCategoryPoints.querySelector(".max-grade")!;
        let newCatScore = Number.parseFloat(catScoreElem.textContent!) + deltaPoints;
        let newCatMax = Number.parseFloat(catMaxElem.textContent!.substring(3)) + deltaMax;
        catScoreElem.textContent = roundDecimal(newCatScore, 2).toString();
        catMaxElem.textContent = " / " + roundDecimal(newCatMax, 2);
        if (warn && !awardedCategoryPoints.querySelector(".modified-score-percent-warning")) {
            awardedCategoryPoints.appendChild(generateScoreModifyWarning());
        }
        // category percentage
        // need to recalculate
        // content wrapper in right grade col
        let awardedCategoryPercentContainer = catRow.querySelector(".grade-column-right")!
            .firstElementChild as HTMLElement;
        let awardedCategoryPercent = awardedCategoryPercentContainer;
        // clear existing percentage indicator
        while (awardedCategoryPercent.firstChild) {
            awardedCategoryPercent.firstChild.remove();
        }
        awardedCategoryPercent.appendChild(document.createElement("span"));
        awardedCategoryPercent = awardedCategoryPercent.firstElementChild as HTMLElement;
        awardedCategoryPercent.classList.add("awarded-grade");
        awardedCategoryPercent.appendChild(document.createElement("span"));
        awardedCategoryPercent = awardedCategoryPercent.firstElementChild as HTMLElement;
        awardedCategoryPercent.classList.add("numeric-grade");
        awardedCategoryPercent.classList.add("primary-grade");
        awardedCategoryPercent.appendChild(document.createElement("span"));
        awardedCategoryPercent = awardedCategoryPercent.firstElementChild as HTMLElement;
        awardedCategoryPercent.classList.add("rounded-grade");

        let newCatPercent = (newCatScore / newCatMax) * 100;
        awardedCategoryPercent.title = newCatPercent + "%";
        awardedCategoryPercent.textContent = Math.round(newCatPercent * 100) / 100 + "%";

        if (
            warn &&
            !awardedCategoryPercentContainer.querySelector(".modified-score-percent-warning")
        ) {
            awardedCategoryPercentContainer.prepend(generateScoreModifyWarning());
        }
        if (courseId) {
            addLetterGrade(awardedCategoryPercent, courseId);
        }
    }

    function recalculatePeriodScore(
        perRow: HTMLElement,
        deltaPoints: number,
        deltaMax: number,
        warn = true,
        courseId?: string
    ) {
        let awardedPeriodPercentContainer = perRow.querySelector(".grade-column-right")!
            .firstElementChild as HTMLElement;
        let awardedPeriodPercent = awardedPeriodPercentContainer;
        // clear existing percentage indicator
        while (awardedPeriodPercent.firstChild) {
            awardedPeriodPercent.firstChild.remove();
        }
        awardedPeriodPercent.appendChild(document.createElement("span"));
        awardedPeriodPercent = awardedPeriodPercent.firstElementChild as HTMLElement;
        awardedPeriodPercent.classList.add("awarded-grade");
        awardedPeriodPercent.appendChild(document.createElement("span"));
        awardedPeriodPercent = awardedPeriodPercent.firstElementChild as HTMLElement;
        awardedPeriodPercent.classList.add("numeric-grade");
        awardedPeriodPercent.classList.add("primary-grade");
        awardedPeriodPercentContainer = awardedPeriodPercent;
        awardedPeriodPercent.appendChild(document.createElement("span"));
        awardedPeriodPercent = awardedPeriodPercent.firstElementChild as HTMLElement;
        awardedPeriodPercent.classList.add("rounded-grade");

        // now period (semester)
        // might have a numeric score (weighting => no numeric, meaning we can assume unweighted if present)
        let awardedPeriodPoints = perRow.querySelector(".grade-column-center");
        if (awardedPeriodPoints && awardedPeriodPoints.textContent!.trim().length !== 0) {
            // awarded grade in our constructed element contains both rounded and max
            let perScoreElem = awardedPeriodPoints.querySelector(".rounded-grade")!;
            let perMaxElem = awardedPeriodPoints.querySelector(".max-grade")!;
            let newPerScore = Number.parseFloat(perScoreElem.textContent!) + deltaPoints;
            let newPerMax = Number.parseFloat(perMaxElem.textContent!.substring(3)) + deltaMax;
            perScoreElem.textContent = roundDecimal(newPerScore, 2).toString();
            perMaxElem.textContent = " / " + roundDecimal(newPerMax, 2);
            if (warn && !awardedPeriodPoints.querySelector(".modified-score-percent-warning")) {
                awardedPeriodPoints.appendChild(generateScoreModifyWarning());
            }

            // go ahead and calculate period percentage here since we know it's unweighted
            let newPerPercent = (newPerScore / newPerMax) * 100;
            awardedPeriodPercent.title = newPerPercent + "%";
            awardedPeriodPercent.textContent = Math.round(newPerPercent * 100) / 100 + "%";
        } else {
            let total = 0;
            let totalPercentWeight = 0;
            for (let category of perRow.parentElement!.querySelectorAll(
                `.category-row[data-parent-id="${perRow.dataset.id}"]`
            )) {
                let weightPercentElement = category.getElementsByClassName("percentage-contrib")[0];
                if (!weightPercentElement) {
                    continue;
                }
                let weightPercent = weightPercentElement.textContent!;
                let col = category.getElementsByClassName("grade-column-right")[0];
                let colMatch = col ? col.textContent!.match(/(\d+\.?\d*)%/) : null;
                if (colMatch) {
                    let scorePercent = Number.parseFloat(colMatch[1]);
                    if (!Number.isNaN(scorePercent)) {
                        total +=
                            (Number.parseFloat(weightPercent.slice(1, -2)) / 100) * scorePercent;
                        totalPercentWeight += Number.parseFloat(weightPercent.slice(1, -2));
                    }
                }
            }

            totalPercentWeight /= 100;

            // if only some categories have assignments, adjust the total accordingly
            // if weights are more than 100, this assumes that it's correct as intended (e.c.), I won't mess with it
            if (totalPercentWeight > 0 && totalPercentWeight < 1) {
                // some categories are specified, but weights don't quite add to 100
                // scale up known grades
                total /= totalPercentWeight;
                // epsilon because floating point
            } else if (totalPercentWeight < 0.00001) {
                total = 100;
            }

            awardedPeriodPercent.title = total + "%";
            awardedPeriodPercent.textContent = Math.round(total * 100) / 100 + "%";
        }

        if (courseId) {
            addLetterGrade(awardedPeriodPercent, courseId);
        }

        awardedPeriodPercentContainer = perRow.querySelector(".grade-column-right")!
            .firstElementChild as HTMLElement;
        if (
            warn &&
            !awardedPeriodPercentContainer.querySelector(".modified-score-percent-warning")
        ) {
            awardedPeriodPercentContainer.prepend(generateScoreModifyWarning());
        }
    }

    function parseAssignmentNumerator(
        numString: string,
        denomFloat: number,
        courseId: string
    ): number {
        if (Number.isNaN(denomFloat)) {
            return Number.NaN;
        }

        let numFloat;
        let percentMatch = /^(-?[0-9]+(\.[0-9]+)?)%$/.exec(numString);

        if (Number.isFinite(denomFloat) && percentMatch && percentMatch[1]) {
            numFloat = (denomFloat * Number.parseFloat(percentMatch[1])) / 100;

            if (!Number.isNaN(numFloat)) {
                return numFloat;
            }
        }

        numFloat = Number.parseFloat(numString);

        if (!Number.isNaN(numFloat)) {
            return numFloat;
        }

        if (Number.isFinite(denomFloat) && courseId) {
            let gradingScale = getGradingScale(courseId);
            for (let gradeScalePercent in gradingScale) {
                let letterSymbol = gradingScale[gradeScalePercent];
                if (numString == letterSymbol) {
                    numFloat = (Number.parseFloat(gradeScalePercent) / 100) * denomFloat;
                    break;
                }
            }
        }

        return Number.isFinite(numFloat) ? numFloat : Number.NaN;
    }

    function removeExceptionState(
        assignment: HTMLElement,
        gradeColContentWrap?: HTMLElement,
        exceptionIcon?: HTMLElement,
        score?: HTMLElement,
        maxGrade?: HTMLElement
    ) {
        if (!gradeColContentWrap) {
            gradeColContentWrap = assignment.querySelector(
                ".grade-column .td-content-wrapper"
            ) as HTMLElement;
        }

        let gradeWrapper = gradeColContentWrap.querySelector(".grade-wrapper");

        if (!exceptionIcon) {
            exceptionIcon = gradeColContentWrap.querySelector(".exception-icon") as HTMLElement;
            if (!exceptionIcon) {
                return {};
            }
        }

        if (!score) {
            score = (gradeColContentWrap.querySelector(".rounded-grade") ||
                gradeColContentWrap.querySelector(".rubric-grade-value")) as HTMLElement;
        }

        if (!maxGrade) {
            maxGrade = gradeColContentWrap.querySelector(".max-grade") as HTMLElement;
        }

        // let retVars = {};

        // the only exception which counts against the user is "missing"
        let missing = exceptionIcon.classList.contains("missing");
        let scoreElem = createElement("span", [missing ? "rounded-grade" : "no-grade"], {
            textContent: missing ? "0" : "—",
        });
        // retVars.editElem = scoreElem;
        // retVars.initPts = 0;
        if (missing) {
            // retVars.score = scoreElem;
            scoreElem = createElement("span", ["awarded-grade"], {}, [scoreElem, maxGrade]);
            // retVars.initMax = Number.parseFloat(maxGrade.textContent.substring(3));
        } else {
            // retVars.initMax = 0;
            // retVars.noGrade = scoreElem;
        }
        // reorganize
        let elemToRemove = exceptionIcon.parentElement?.parentElement;
        let nodesToMoveHolder = exceptionIcon.parentElement;

        exceptionIcon.insertAdjacentElement("afterend", scoreElem);
        exceptionIcon.remove();

        let nodesToMove = Array.from(nodesToMoveHolder?.childNodes ?? []) as HTMLElement[];
        let nodesAfterMove = nodesToMove.splice(nodesToMove.findIndex(x => x.tagName == "BR"));
        nodesToMove.reverse();
        nodesAfterMove.reverse();
        for (let i = 0; i < nodesToMove.length; i++) {
            gradeColContentWrap.insertAdjacentElement("afterbegin", nodesToMove[i]);
        }
        for (let i = 0; i < nodesAfterMove.length; i++) {
            gradeWrapper?.insertAdjacentElement("afterend", nodesAfterMove[i]);
        }
        elemToRemove?.remove();

        assignment.classList.remove("contains-exception");
    }

    function createEditListener(
        assignment: HTMLElement,
        gradeColContentWrap: HTMLElement,
        catRow: HTMLElement,
        perRow: HTMLElement,
        finishedCallback?: CallableFunction | null
    ) {
        return function () {
            trackEvent("button_click", {
                id: "change-assignment-grade",
                context: "What-If Grades",
                legacyTarget: "assignment",
                legacyAction: "change-grade",
                legacyLabel: "What-If Grades",
            });
            removeExceptionState(assignment, gradeColContentWrap);

            let noGrade = gradeColContentWrap.querySelector<HTMLElement>(".no-grade");
            let score =
                gradeColContentWrap.querySelector<HTMLElement>(".rounded-grade") ||
                gradeColContentWrap.querySelector<HTMLElement>(".rubric-grade-value");
            // note that this will always return (for our injected percentage element)
            let maxGrade = gradeColContentWrap.querySelector<HTMLElement>(".max-grade");
            let editElem: HTMLElement | null = null;
            let initPts: number;
            let initMax: number;
            if (noGrade) {
                editElem = noGrade;
                initPts = 0;
                initMax = 0;
                if (maxGrade && maxGrade.classList.contains("no-grade")) {
                    maxGrade.remove();
                    maxGrade = null;
                }
            }
            if (score && maxGrade) {
                editElem = score;
                initPts = Number.parseFloat(score.textContent!);
                initMax = Number.parseFloat(maxGrade.textContent!.substring(3));
            }

            if (!editElem || editElem.classList.contains("student-editable")) {
                return;
            }

            editElem.classList.add("student-editable");
            editElem.contentEditable = "true";

            // TODO refactor
            // (this) tr -> tbody -> table -> div.gradebook-course-grades -> relevant div
            let courseId = Number.parseInt(
                /course-(\d+)$/.exec(
                    perRow.parentElement!.parentElement!.parentElement!.parentElement!.id
                )![1]
            ).toString();

            // TODO blur v focusout
            let submitFunc = function () {
                if (!editElem?.classList.contains("student-editable")) {
                    // we've already processed this event, ignore and return for cleanup
                    return true;
                }

                let userScore: number;
                let userMax: number;
                if (noGrade) {
                    // regex capture and check
                    if (maxGrade) {
                        // noGrade+maxGrade = inserted maxGrade from an API call
                        // initDenom = 0; newDenom = whatever is in that textfield
                        userMax = Number.parseFloat(maxGrade.textContent!.substring(3));
                        userScore = parseAssignmentNumerator(
                            noGrade.textContent!,
                            userMax,
                            courseId
                        );
                    } else {
                        let regexResult = /^(-?\d+(\.\d+)?)\s*\/\s*(-?\d+(\.\d+)?)$/.exec(
                            editElem.textContent!
                        );
                        if (!regexResult) {
                            return false;
                        }
                        userMax = Number.parseFloat(regexResult[3]);
                        userScore = parseAssignmentNumerator(regexResult[1], userMax, courseId);
                    }
                    if (Number.isNaN(userScore) || Number.isNaN(userMax)) {
                        return false;
                    }
                } else if (score) {
                    // user entered number must be a numeric
                    userScore = parseAssignmentNumerator(score.textContent!, initMax, courseId);
                    userMax = initMax;
                    if (Number.isNaN(userScore)) {
                        return false;
                    }
                } else {
                    // ???
                    Logger.warn("unexpected case of field type in editing grade");
                    return false;
                }

                // we've established a known new score and max, with an init score and max to compare to
                let deltaPoints = userScore - initPts;
                let deltaMax = userMax - initMax;
                // first, replace no grades
                if (noGrade) {
                    if (!maxGrade) {
                        maxGrade = createElement("span", ["max-grade"], {
                            textContent: " / " + userMax,
                        });
                        gradeColContentWrap.prepend(maxGrade);
                    }
                    let awardedGrade = createElement("span", ["awarded-grade"]);
                    score = createElement("span", ["rounded-grade"], {
                        title: userScore.toString(),
                        textContent: userScore.toString(),
                    });
                    awardedGrade.appendChild(score);
                    gradeColContentWrap.prepend(score);
                    noGrade.remove();
                } else if (score && maxGrade) {
                    // we already have our DOM elements
                    score.title = userScore.toString();
                    score.textContent = userScore.toString();
                    // will not have changed but still
                    maxGrade.textContent = " / " + userMax;
                    score.contentEditable = "false";
                    score.classList.remove("student-editable");

                    // if there's a letter grade, remove it - it might be inaccurate
                    if (
                        score.parentElement &&
                        score.parentElement.parentElement &&
                        score.parentElement.parentElement.tagName.toUpperCase() === "SPAN" &&
                        score.parentElement.parentElement.classList.contains("awarded-grade") &&
                        /^[A-DF] /.test(score.parentElement!.parentElement!.textContent!)
                    ) {
                        // note use of childNodes, it's not its own element
                        score.parentElement.parentElement.childNodes[0].remove();
                    }
                }
                // update the assignment percentage
                prepareScoredAssignmentGrade(
                    gradeColContentWrap.querySelector(
                        ".injected-assignment-percent"
                    ) as HTMLElement,
                    userScore,
                    userMax
                );
                if (!gradeColContentWrap.querySelector(".modified-score-percent-warning")) {
                    //gradeColContentWrap.getElementsByClassName("injected-assignment-percent")[0].style.paddingRight = "0";
                    gradeColContentWrap.appendChild(generateScoreModifyWarning());
                    gradesModified = true;
                }

                // don't alter totals for dropped assignment
                if (assignment.classList.contains("dropped")) {
                    if (finishedCallback) {
                        finishedCallback();
                    }

                    return true;
                }

                recalculateCategoryScore(catRow, deltaPoints, deltaMax, true, courseId);
                recalculatePeriodScore(perRow, deltaPoints, deltaMax, true, courseId);

                if (finishedCallback) {
                    finishedCallback();
                }

                return true;
            };
            let cleanupFunc = function () {
                editElem?.removeEventListener("blur", blurFunc);
                editElem?.removeEventListener("keydown", keyFunc);
            };
            let keyFunc = function (event: KeyboardEvent) {
                if (event.which == 13 || event.keyCode == 13) {
                    editElem?.blur();
                    return false;
                }
                return true;
            };
            let blurFunc = function () {
                if (submitFunc()) {
                    cleanupFunc();
                    var sel = window.getSelection ? window.getSelection() : document.getSelection();
                    if (sel) {
                        if (sel.removeAllRanges) {
                            sel.removeAllRanges();
                        } else if (sel.empty) {
                            sel.empty();
                        }
                    }
                } else {
                    editElem?.focus();
                }
                return false;
            };
            editElem.addEventListener("blur", blurFunc);
            editElem.addEventListener("keydown", keyFunc);
            editElem.focus();
            document.execCommand("selectAll", false, null as any);
        };
    }
}

function createAddAssignmentElement(category: HTMLElement) {
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
function roundDecimal(num: number, dec: number) {
    let intPart = Math.floor(num);
    let floatPart = num - intPart;
    return intPart + Math.round(floatPart * Math.pow(10, dec)) / Math.pow(10, dec);
}
