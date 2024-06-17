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

    public get categoriesAreWeighted() {
        return this.categories.some(category => category.weight !== undefined);
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

    public get gradePercent() {
        if (this.assignments.length === 0) return undefined;

        let totalPoints = 0;
        let totalMaxPoints = 0;

        for (let assignment of this.assignments) {
            if (assignment.ignoreInCalculations) continue;
            if (assignment.points === undefined) continue;

            totalPoints += assignment.points;
            totalMaxPoints += assignment.maxPoints ?? 0;
        }

        return totalMaxPoints === 0
            ? Number.POSITIVE_INFINITY
            : (totalPoints * 100) / totalMaxPoints;
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
        } catch (err) {
            Logger.warn("Error parsing points for assignment", this, err);
        }

        try {
            let maxPointsElement = this.element.querySelector(".max-grade");

            this.maxPoints = maxPointsElement
                ? Number.parseFloat(maxPointsElement.textContent!)
                : undefined;
        } catch (err) {
            Logger.warn("Error parsing max points for assignment", this, err);
        }

        this.comment = getTextNodeContent(element.querySelector(".comment-column .comment")!);
        this.exception =
            element.querySelector(".exception .exception-text")?.textContent ?? undefined;

        this.ignoreInCalculations = this.exception !== undefined;

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
        return (this.points === undefined || this.maxPoints === undefined) && !this.failedToLoad;
    }

    private async loadPointsFromApi() {
        Logger.log(`Fetching max points for (nonentered) assignment ${this.id}`);

        if (this.points !== undefined && this.maxPoints !== undefined) return;

        let response: Response | null = null;
        let firstTryError: any = null;

        try {
            response = await fetchApi(`sections/${this.course.id}/assignments/${this.id}`);
        } catch (err) {
            firstTryError = err;
        }

        if (response && !response.ok) {
            firstTryError = { status: response.status, error: response.statusText };
        } else if (response) {
            try {
                let json = await response.json();

                if (json && json.max_points !== undefined) {
                    this.maxPoints = json.max_points;
                } else {
                    firstTryError = "JSON returned without max points";
                }
            } catch (err) {
                firstTryError = err;
            }
        } else if (!firstTryError) {
            firstTryError = "Unknown error fetching API response";
        }

        if (!firstTryError && this.points !== undefined) return;

        if (firstTryError) {
            Logger.log(
                `Error directly fetching max points for assignment ${this.id}, reverting to list-search`
            );
        }
        if (this.points === undefined) {
            Logger.log(
                `Finding grade for letter-grade-only assignment ${this.id} from list-search`
            );
        }

        try {
            response = await fetchApi(`users/${getUserId()}/grades?section_id=${this.course.id}`);
            if (!response.ok) {
                throw { status: response.status, error: response.statusText };
            }
            let json = await response.json();

            if (json && json.section.length > 0) {
                // success case
                let jsonAssignment = json.section[0].period
                    .flatMap((p: any) => p.assignment)
                    .filter((x: any) => x.assignment_id == Number.parseInt(this.id!))[0];

                if (this.points === undefined && jsonAssignment.grade !== undefined) {
                    this.points = jsonAssignment.grade;
                }
            } else {
                throw "List search failed to obtain meaningful response";
            }
        } catch (err) {
            this.failedToLoad = true;
            throw { listSearchErr: err, firstTryError: firstTryError };
        }
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
        if (this.isLoading) return "...";
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
}

export function loadWhatIfGrades() {
    let courses = loadCourses();
    Logger.log("Loaded courses:", courses);
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
