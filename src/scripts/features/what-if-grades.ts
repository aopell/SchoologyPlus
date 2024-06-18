import { fetchApi, getUserId } from "../utils/api";
import { getTextNodeContent } from "../utils/dom";
import { Logger } from "../utils/logger";

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

    constructor(public element: HTMLElement) {
        this.id = this.element.id.match(/\d+/)![0];
        this.name = getTextNodeContent(
            this.element.querySelector(".gradebook-course-title > a[href]")!
        );
        this.gradebookTable = this.element.querySelector<HTMLTableElement>(
            ".gradebook-course-grades > table"
        )!;
    }

    public load() {
        let periodElements =
            this.gradebookTable.querySelectorAll<HTMLTableRowElement>("tr.period-row");

        for (let periodElement of periodElements) {
            let period = new SchoologyGradebookPeriod(this, periodElement);
            this.periods.push(period);
            period.load();
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

    private _cachedListSearch: any = undefined;

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

        this.loadPointsFromApi();
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
            if (this._cachedListSearch === undefined) {
                response = await fetchApi(
                    `users/${getUserId()}/grades?section_id=${this.course.id}`
                );
                if (!response.ok) {
                    throw { status: response.status, error: response.statusText };
                }
                this._cachedListSearch = await response.json();
            }

            if (this._cachedListSearch && this._cachedListSearch.section.length > 0) {
                // success case
                let jsonAssignment = this._cachedListSearch.section[0].period
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
                throw `Failed to load points from API: ${this._cachedListSearch}`;
            }

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
        Logger.log(courseToString(course));
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

export function courseToString(course: SchoologyCourse) {
    let courseString = [];
    courseString.push(course.toString());
    for (let period of course.periods) {
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
