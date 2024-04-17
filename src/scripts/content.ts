import * as pages from "./pages";
import * as utils from "./utils";
import { initializeAnalytics } from "./utils/analytics";
import { Setting, generateDebugInfo } from "./utils/settings";

declare global {
    var SchoologyPlus: any;
}

globalThis.SchoologyPlus = {
    Setting,
    utils,
    pages,
    debug: JSON.parse(generateDebugInfo()),
};

// checks to see if the current page matches the given path pattern
function matchPage(...patterns: RegExp[]) {
    return patterns.some(pattern => pattern.test(globalThis.location.pathname));
}

// function that returns a promise that resolves when the document is ready
function ready() {
    return new Promise<void>(resolve => {
        if (document.readyState != "loading") {
            resolve();
        } else {
            document.addEventListener("DOMContentLoaded", () => resolve());
        }
    });
}

async function load() {
    await initializeAnalytics();
    await pages.all.preload();
    await ready();
    await pages.all.load();

    if (
        matchPage(
            /^\/grades\/grades$/, // matches /grades/grades
            /^\/course\/\d+\/student_grades$/ // matches /course/1234/student_grades
        )
    ) {
        await pages.grades.load();
        await pages.course.load();
    }

    if (
        matchPage(
            /^\/course\/\d+\/materials$/ // matches /course/1234/materials
        )
    ) {
        await pages.materials.load();
    }

    if (
        matchPage(
            /^\/$/, // matches /
            /^\/home$/, // matches /home
            /^\/home\/(recent-activity|course-dashboard)$/ // matches /home/recent-activity and /home/course-dashboard
        )
    ) {
        await pages.course.load();
        await pages.home.load();
    }

    if (
        matchPage(
            /^\/course\/\d+/ // matches /course/1234(...)
        )
    ) {
        await pages.course.load();
    }

    if (
        matchPage(
            /^\/api/ // matches /api(...)
        )
    ) {
        await pages.apikey.load();
    }

    if (
        matchPage(
            /^\/user\/\d+$/ // matches /user/1234
        )
    ) {
        await pages.user.load();
    }

    if (
        matchPage(
            /^\/assignment\/\d+\/assessment$/ // matches /assignment/1234/assessment
        )
    ) {
        await pages.assessment.load();
    }

    if (
        matchPage(
            /^\/page\// // matches /page/(...)
        )
    ) {
        await pages.page.load();
    }

    if (
        matchPage(
            /^\/courses/ // matches /courses(...)
        )
    ) {
        await pages.course.load();
        await pages.courses.load();
    }
}

load();
