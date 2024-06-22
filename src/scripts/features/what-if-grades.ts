import { fetchApi, getUserId } from "../utils/api";
import { EXTENSION_NAME } from "../utils/constants";
import { createElement, getTextNodeContent } from "../utils/dom";
import { Logger } from "../utils/logger";
import { getGradingScale } from "../utils/settings";
import { Settings } from "../utils/splus-settings";

/*
    Basic idea of what to do:
     - we always maintain the source of truth state in these models
     - when the user makes a change, we updated "what-if" state of model and re-render the UI
*/

export class SchoologyCourse {
    public periods: SchoologyGradebookPeriod[] = [];
    public id: string;
    public name: string;
    public gradebookTable: HTMLTableElement;

    private _cachedListSearch: any = undefined;

    constructor(public element: HTMLElement) {
        this.id = this.element.id.match(/\d+/)![0];
        this.name = getTextNodeContent(
            this.element.querySelector(".gradebook-course-title > a[href]")!
        );
        this.gradebookTable = this.element.querySelector<HTMLTableElement>(
            ".gradebook-course-grades > table"
        )!;
    }

    public async load() {
        let periodElements =
            this.gradebookTable.querySelectorAll<HTMLTableRowElement>("tr.period-row");

        await this.cacheListSearch();

        this.initElements();

        for (let periodElement of periodElements) {
            let period = new SchoologyGradebookPeriod(this, periodElement);
            this.periods.push(period);
            period.load();
        }

        this.render();
    }

    private _elem_title: HTMLAnchorElement | null = null;
    private _elem_summary: HTMLElement | null = null;
    private _elem_courseGrade: HTMLElement | null = null;
    private _elem_gradeText: HTMLElement | null = null;

    private initElements() {
        this._elem_title =
            this.element.querySelector<HTMLAnchorElement>(".gradebook-course-title")!;
        this._elem_summary = this.element.querySelector(".summary-course")!;
        let awardedGrade = this.element.querySelector<HTMLElement>(".awarded-grade");
        if (awardedGrade) {
            this._elem_courseGrade = awardedGrade;
        } else {
            this._elem_courseGrade = createElement("span", [], {
                textContent: `${this.apiCourseAssignments.section[0].final_grade
                    .at(-1)
                    .grade.toString()}%`,
            });
        }
        this._elem_gradeText = createElement(
            "span",
            [
                "awarded-grade",
                "injected-title-grade",
                this._elem_courseGrade ? "grade-active-color" : "grade-none-color",
            ],
            { textContent: "LOADING" }
        );
        this._elem_title.appendChild(this._elem_gradeText);
    }

    public async render() {
        if (!this.isLoading) {
            this.addLetterGrade(this._elem_gradeText!);
        }
    }

    private addLetterGrade(elem: HTMLElement) {
        let gradingScale = getGradingScale(this.id);
        if (Settings.CustomGradingScales.value != "disabled") {
            let letterGrade = getLetterGrade(gradingScale, this.gradePercent);
            elem.textContent = `${letterGrade} (${this.gradePercentageString})`;
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

    public get isLoading() {
        return this.periods.some(period => period.isLoading);
    }

    public get failedToLoad() {
        return this.periods.some(period => period.failedToLoad);
    }

    public get gradePercent() {
        let weightedPoints = this.periods.reduce((acc, period) => {
            if (period.weight === undefined) return acc;

            return acc + period.points * period.weight;
        }, 0);

        let weightedMaxPoints = this.periods.reduce((acc, period) => {
            if (period.weight === undefined) return acc;

            return acc + period.maxPoints * period.weight;
        }, 0);

        if (weightedPoints === 0 && weightedMaxPoints === 0) return undefined;
        if (weightedMaxPoints === 0) return Number.POSITIVE_INFINITY;
        if (weightedPoints === 0) return 0;

        return (weightedPoints * 100) / weightedMaxPoints;
    }

    public get gradePercentageString() {
        if (this.isLoading) return "LOADING";
        if (this.failedToLoad) return "ERR";
        if (this.gradePercent === undefined) return "—";
        if (this.gradePercent === Number.POSITIVE_INFINITY) return "EC";
        return `${Math.round(this.gradePercent)}%`;
    }

    public get gradePercentageDetailsString() {
        if (this.isLoading) return "Loading grade percentage...";
        if (this.failedToLoad) return "Failed to load grade percentage";
        if (this.gradePercent === undefined) return undefined;
        if (this.gradePercent === Number.POSITIVE_INFINITY) return "Extra Credit";
        return `${this.gradePercent.toFixed(2)}%`;
    }

    public toString() {
        return `${this.name} (${this.id}) - ${this.gradePercentageString}`;
    }

    public toDetailedString() {
        let courseString = [];
        courseString.push(this.toString());
        for (let period of this.periods) {
            courseString.push(`  ${period.toString()}`);
            for (let category of period.categories) {
                courseString.push(`    ${category.toString()}`);
                for (let assignment of category.assignments) {
                    courseString.push(`      ${assignment.toString()}`);
                }
            }
        }

        return courseString.join("\n");
    }

    private async cacheListSearch() {
        try {
            if (this._cachedListSearch === undefined) {
                let response = await fetchApi(`users/${getUserId()}/grades?section_id=${this.id}`);
                if (!response.ok) {
                    throw { status: response.status, error: response.statusText };
                }
                this._cachedListSearch = await response.json();
                Logger.debug(`Successfully cached list search for course ${this.id}`);
            }
        } catch (err) {
            Logger.error("Failed to cache list search", err);
            this._cachedListSearch = null;
        }
    }

    public get apiCourseAssignments() {
        return this._cachedListSearch;
    }
}

export class SchoologyGradebookPeriod {
    public categories: SchoologyGradebookCategory[] = [];
    public id: string;
    public name: string;
    public weight: number;

    constructor(public course: SchoologyCourse, public element: HTMLElement) {
        this.id = this.element.dataset.id!;
        this.name = getTextNodeContent(
            this.element.querySelector<HTMLAnchorElement>(".title-column .title")!
        );
        this.weight =
            Number.parseFloat(
                this.element
                    .querySelector(".title-column .percentage-contrib")!
                    .textContent!.match(/\d+/)![0]
            ) / 100;
    }

    public load() {
        let categoryElements = Array.from(
            this.course.gradebookTable.querySelectorAll<HTMLTableRowElement>("tr.category-row")
        ).filter(categoryElement => categoryElement.dataset.parentId === this.id);

        for (let categoryElement of categoryElements) {
            let category = new SchoologyGradebookCategory(this, categoryElement);
            this.categories.push(category);
            category.load();
        }

        this.render();
    }

    public async render() {
        this.course.render();
    }

    public get categoriesAreWeighted() {
        return this.categories.some(category => category.weight !== undefined);
    }

    public get isLoading() {
        return this.categories.some(category => category.isLoading);
    }

    public get failedToLoad() {
        return this.categories.some(category => category.failedToLoad);
    }

    public get points(): number {
        if (this.categoriesAreWeighted) return this.gradePercent ?? 0;

        return this.categories.reduce((acc, category) => {
            if (category.weight === undefined) return acc + category.points;

            return acc + category.points * category.weight;
        }, 0);
    }

    public get maxPoints() {
        if (this.categoriesAreWeighted) return 100;

        return this.categories.reduce((acc, category) => {
            if (category.weight === undefined) return acc + category.maxPoints;

            return acc + category.maxPoints * category.weight;
        }, 0);
    }

    public get gradePercent() {
        if (this.categoriesAreWeighted) {
            let weightedPoints = this.categories.reduce((acc, category) => {
                if (category.weight === undefined) return acc;

                return acc + category.points * category.weight;
            }, 0);

            let weightedMaxPoints = this.categories.reduce((acc, category) => {
                if (category.weight === undefined) return acc;

                return acc + category.maxPoints * category.weight;
            }, 0);

            if (weightedPoints === 0 && weightedMaxPoints === 0) return undefined;
            if (weightedMaxPoints === 0) return Number.POSITIVE_INFINITY;
            if (weightedPoints === 0) return 0;

            return (weightedPoints * 100) / weightedMaxPoints;
        }
        if (this.maxPoints === 0 && this.points === 0) return undefined;
        if (this.maxPoints === 0) return Number.POSITIVE_INFINITY;
        if (this.points === 0) return 0;

        return (this.points * 100) / this.maxPoints;
    }

    public get gradePercentageString() {
        if (this.isLoading) return "LOADING";
        if (this.failedToLoad) return "ERR";
        if (this.gradePercent === undefined) return "—";
        if (this.gradePercent === Number.POSITIVE_INFINITY) return "EC";
        return `${Math.round(this.gradePercent)}%`;
    }

    public get gradePercentageDetailsString() {
        if (this.isLoading) return "Loading grade percentage...";
        if (this.failedToLoad) return "Failed to load grade percentage";
        if (this.gradePercent === undefined) return undefined;
        if (this.gradePercent === Number.POSITIVE_INFINITY) return "Extra Credit";
        return `${this.gradePercent.toFixed(2)}%`;
    }

    public toString() {
        return `${this.name} (${this.id}) - ${this.points}/${this.maxPoints} - ${this.gradePercentageString}`;
    }
}

export class SchoologyGradebookCategory {
    public assignments: SchoologyAssignment[] = [];
    public id: string;
    public name: string;
    public weight?: number;

    constructor(public period: SchoologyGradebookPeriod, public element: HTMLElement) {
        this.id = this.element.dataset.id!;
        this.name = getTextNodeContent(
            this.element.querySelector<HTMLAnchorElement>(".title-column .title")!
        );

        let weightedElement = this.element.querySelector(".title-column .percentage-contrib");

        if (weightedElement) {
            this.weight = Number.parseFloat(weightedElement.textContent!.match(/\d+/)![0]) / 100;
        }
    }

    public get course() {
        return this.period.course;
    }

    public load() {
        let assignmentElements = Array.from(
            this.course.gradebookTable.querySelectorAll<HTMLTableRowElement>("tr.item-row")
        ).filter(assignmentElement => assignmentElement.dataset.parentId === this.id);

        for (let assignmentElement of assignmentElements) {
            let assignment = new SchoologyAssignment(this, assignmentElement);
            this.assignments.push(assignment);
        }

        this.render();
    }

    public async render() {
        this.period.render();
    }

    public get isLoading() {
        return this.assignments.some(assignment => assignment.isLoading);
    }

    public get failedToLoad() {
        return this.assignments.some(assignment => assignment.failedToLoad);
    }

    public get points() {
        return this.assignments.reduce((acc, assignment) => {
            if (assignment.ignoreInCalculations) return acc;

            return acc + (assignment.points ?? 0);
        }, 0);
    }

    public get maxPoints() {
        return this.assignments.reduce((acc, assignment) => {
            if (assignment.ignoreInCalculations) return acc;

            return acc + (assignment.maxPoints ?? 0);
        }, 0);
    }

    public get gradePercent() {
        if (this.maxPoints === 0 && this.points === 0) return undefined;
        if (this.maxPoints === 0) return Number.POSITIVE_INFINITY;
        if (this.points === 0) return 0;

        return (this.points * 100) / this.maxPoints;
    }

    public get gradePercentageString() {
        if (this.isLoading) return "LOADING";
        if (this.failedToLoad) return "ERR";
        if (this.gradePercent === undefined) return "—";
        if (this.gradePercent === Number.POSITIVE_INFINITY) return "EC";
        return `${Math.round(this.gradePercent)}%`;
    }

    public get gradePercentageDetailsString() {
        if (this.isLoading) return "Loading grade percentage...";
        if (this.failedToLoad) return "Failed to load grade percentage";
        if (this.gradePercent === undefined) return undefined;
        if (this.gradePercent === Number.POSITIVE_INFINITY)
            return `${this.points} points of Extra Credit`;
        return `${this.gradePercent.toFixed(2)}%`;
    }

    public toString() {
        return `${this.name} (${this.id}) - ${this.points}/${this.maxPoints} - ${this.gradePercentageString}`;
    }
}

export class SchoologyAssignment {
    public id: string;
    public name: string;
    public points?: number;
    public maxPoints?: number;
    public comment?: string;
    public exception?: string;
    public ignoreInCalculations: boolean;
    public isMissing: boolean = false;
    public failedToLoad: boolean = false;

    constructor(public category: SchoologyGradebookCategory, public element: HTMLElement) {
        this.id = this.element.dataset.id!.substring(2);
        this.name = getTextNodeContent(
            element.querySelector<HTMLAnchorElement>(".title-column .title > a[href]")!
        );

        try {
            let scoreElement =
                this.element.querySelector(".rounded-grade") ||
                this.element.querySelector(".rubric-grade-value");

            this.points = scoreElement ? Number.parseFloat(scoreElement!.textContent!) : undefined;

            if (Number.isNaN(this.points)) throw "NaN";
        } catch (err) {
            this.points = undefined;
            Logger.warn("Error parsing points for assignment", this, err);
        }

        try {
            let maxPointsElement = this.element.querySelector(".max-grade");

            this.maxPoints = maxPointsElement
                ? Number.parseFloat(maxPointsElement.textContent!.match(/\d+/)![0])
                : undefined;

            if (Number.isNaN(this.maxPoints)) throw "NaN";
        } catch (err) {
            this.maxPoints = undefined;
            Logger.warn("Error parsing max points for assignment", this, err);
        }

        this.comment = getTextNodeContent(element.querySelector(".comment-column .comment")!);
        this.exception =
            element.querySelector(".exception .exception-text")?.textContent ?? undefined;

        this.ignoreInCalculations =
            this.exception !== undefined ||
            (this.points === undefined && this.maxPoints === undefined);

        if (this.element.querySelector(".exception-icon.missing")) {
            this.ignoreInCalculations = false;
            this.points = 0;
            this.maxPoints = undefined;
            this.isMissing = true;
        }

        this.loadPointsFromApi().then(() => this.render());
    }

    public async render() {
        this.category.render();
    }

    public get course() {
        return this.category.course;
    }

    public get isLoading() {
        return (
            (this.points === undefined || this.maxPoints === undefined) &&
            !this.ignoreInCalculations &&
            !this.failedToLoad
        );
    }

    private async loadPointsFromApi() {
        Logger.debug(`Fetching max points for (nonentered) assignment ${this.id}`);

        let needToLoadPoints = () => {
            return this.points === undefined && !this.ignoreInCalculations && !this.exception;
        };

        let needToLoadMaxPoints = () => {
            return this.maxPoints === undefined && !this.ignoreInCalculations;
        };

        if (!needToLoadPoints() && !needToLoadMaxPoints()) return;

        let response: Response | null = null;
        let firstTryError: any = null;
        let listSearchError: any = null;

        try {
            let listSearch = this.course.apiCourseAssignments;
            if (listSearch && listSearch.section.length > 0) {
                // success case
                let jsonAssignment = listSearch.section[0].period
                    .flatMap((p: any) => p.assignment)
                    .filter((x: any) => x.assignment_id == Number.parseInt(this.id!))[0];

                if (
                    needToLoadPoints() &&
                    jsonAssignment.grade !== undefined &&
                    jsonAssignment.grade !== null
                ) {
                    this.points = Number.parseFloat(jsonAssignment.grade);
                }

                if (
                    needToLoadMaxPoints() &&
                    jsonAssignment.max_points !== undefined &&
                    jsonAssignment.max_points !== null
                ) {
                    this.maxPoints = Number.parseFloat(jsonAssignment.max_points);
                }
            }

            if (needToLoadPoints() || needToLoadMaxPoints()) {
                throw `Failed to load points from list search for assignment ${this.id}`;
            }

            Logger.debug(`Successfully loaded points for assignment ${this.id} from list search`);

            return;
        } catch (err) {
            listSearchError = err;
        }

        if (!needToLoadPoints()) {
            try {
                response = await fetchApi(`sections/${this.course.id}/assignments/${this.id}`);

                if (response && !response.ok) {
                    firstTryError = { status: response.status, error: response.statusText };
                } else if (response) {
                    let json = await response.json();

                    if (json && json.max_points !== undefined && json.max_points !== null) {
                        this.maxPoints = Number.parseFloat(json.max_points);
                        Logger.debug(
                            `Successfully loaded max points for assignment ${this.id} from API`
                        );
                        return;
                    } else {
                        firstTryError = "JSON returned without max points";
                    }
                } else if (!firstTryError) {
                    firstTryError = "Unknown error fetching API response";
                }
            } catch (err) {
                firstTryError = err;
            }
        }

        this.failedToLoad = true;
        Logger.error(
            `Failed to load points for assignment "${this.name}" (${this.id}) from category "${this.category.name}" from period "${this.category.period.name}" from course "${this.category.period.course.name}" (${this.category.period.course.id})`,
            { firstTryError, listSearchError }
        );
    }

    public async waitForPoints(timeout: number = 30000) {
        return new Promise<void>((resolve, reject) => {
            let startTime = Date.now();
            let interval = setInterval(() => {
                if (this.points !== undefined && this.maxPoints !== undefined) {
                    clearInterval(interval);
                    resolve();
                }

                if (this.failedToLoad || Date.now() - startTime >= timeout) {
                    clearInterval(interval);
                    reject(
                        new Error(
                            `Timeout (${timeout} ms) waiting for points on assignment "${this.name}" (${this.id}) from category "${this.category.name}" from period "${this.category.period.name}" from course "${this.category.period.course.name}" (${this.category.period.course.id})`
                        )
                    );
                }
            }, 500);
        });
    }

    public get gradePercent() {
        if (this.ignoreInCalculations) return undefined;
        if (this.maxPoints === 0) return Number.POSITIVE_INFINITY;
        if (this.points === 0) return 0;

        return this.points !== undefined && this.maxPoints !== undefined
            ? (this.points * 100) / this.maxPoints
            : undefined;
    }

    public get gradePercentageString() {
        if (this.isLoading) return "LOADING";
        if (this.failedToLoad) return "ERR";
        if (this.gradePercent === undefined) return "—";
        if (this.gradePercent === Number.POSITIVE_INFINITY) return "EC";
        return `${Math.round(this.gradePercent)}%`;
    }

    public get gradePercentageDetailsString() {
        if (this.isLoading) return "Loading grade percentage...";
        if (this.failedToLoad) return "Failed to load grade percentage";
        if (this.gradePercent === undefined) return undefined;
        if (this.gradePercent === Number.POSITIVE_INFINITY)
            return `${this.points} points of Extra Credit`;
        return `${this.gradePercent.toFixed(2)}%`;
    }

    public toString() {
        return `${this.name} (${this.id}) - ${this.points}/${this.maxPoints} - ${this.gradePercentageString} - ${this.comment} - ${this.exception}`;
    }
}

export function loadWhatIfGrades() {
    let courses = loadCourses();
    Logger.log("Loaded courses:", courses);

    for (let course of courses) {
        Logger.log(course.toDetailedString());
    }

    return courses;
}

export function loadCourses() {
    let courseElements = document.querySelectorAll<HTMLDivElement>("div.gradebook-course");

    let courses: SchoologyCourse[] = [];

    for (let courseElement of courseElements) {
        let course = new SchoologyCourse(courseElement);
        courses.push(course);
        course.load();
    }

    return courses;
}

function getLetterGrade(gradingScale: Record<string, string>, percentage?: number): string {
    if (percentage === undefined) return "?";

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
