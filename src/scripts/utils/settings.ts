import browser from "webextension-polyfill";
import { createElement } from "./dom";

var SIDEBAR_SECTIONS = [
    {
        name: "Quick Access",
        selector: "#right-column-inner div.quick-access-wrapper"
    },
    {
        name: "Reminders",
        selector: "#right-column-inner div.reminders-wrapper"
    },
    {
        name: "Overdue",
        selector: "#right-column-inner div#overdue-submissions.overdue-submissions-wrapper"
    },
    {
        name: "Upcoming",
        selector: "#right-column-inner div.upcoming-submissions-wrapper"
    },
    {
        name: "Upcoming Events",
        selector: "#right-column-inner div#upcoming-events.upcoming-events-wrapper"
    },
    {
        name: "Recently Completed",
        selector: "#right-column-inner div.recently-completed-wrapper"
    },
];


var modalContents: HTMLDivElement | undefined = undefined;

function getModalContents() {
    return modalContents || createElement("p", [], { textContent: "Error loading settings" });
}


/**
 * Returns `true` if current domain is `lms.lausd.net`
 * @returns {boolean}
 */
function isLAUSD() {
    return Setting.getValue("defaultDomain") === "lms.lausd.net";
}

var SIDEBAR_SECTIONS_MAP = Object.fromEntries(SIDEBAR_SECTIONS.map(s => [s.name, s]));
var firstLoad = true;

/** @type {Object.<string,any>} */
let __storage: { [s: string]: any; } = {};

/**
 * Updates the contents of the settings modal to reflect changes made by the user to all settings
 * @param {()=>any} callback Called after settings are updated
 */
async function updateSettings(callback: () => any) {
    const storageContents = await browser.storage.sync.get(null);
    __storage = storageContents;

    // wrapper functions for e.g. defaults
    __storage.getGradingScale = function (courseId: string | null) {
        let defaultGradingScale = { "90": "A", "80": "B", "70": "C", "60": "D", "0": "F" };

        if (__storage.defaultGradingScale) {
            defaultGradingScale = __storage.defaultGradingScale;
        }

        if (courseId !== null && __storage.gradingScales && __storage.gradingScales[courseId]) {
            return __storage.gradingScales[courseId];
        }

        return defaultGradingScale;
    }

    if (firstLoad) {
        if (storageContents.themes) {
            for (let t of storageContents.themes) {
                themes.push(Theme.loadFromObject(t));
            }
        }

        Theme.apply(Theme.active);
        firstLoad = false;
    }

    let noControl = document.createElement("div");

    modalContents = createElement("div", [], undefined, [
        createElement("div", ["splus-modal-contents", "splus-settings-tabs"], {}, [
            createElement("ul", [], {}, [
                createElement("li", [], {}, [createElement("a", [], { href: "#splus-settings-section-appearance", textContent: "Appearance" })]),
                createElement("li", [], {}, [createElement("a", [], { href: "#splus-settings-section-sidebar", textContent: "Homepage/Sidebar" })]),
                createElement("li", [], {}, [createElement("a", [], { href: "#splus-settings-section-grades", textContent: "Grades" })]),
                createElement("li", [], {}, [createElement("a", [], { href: "#splus-settings-section-utilities", textContent: "Utilities" })]),
            ]),
            createElement("div", [], { id: "splus-settings-section-appearance" }, [
                new Setting(
                    "themeEditor",
                    "Theme Editor",
                    "Click to open the theme editor to create, edit, or select a theme",
                    "Theme Editor",
                    "button",
                    {},
                    value => "Theme Editor",
                    event => location.href = chrome.runtime.getURL("/theme-editor.html")
                ).control,
                new Setting(
                    "theme",
                    "Theme",
                    "Change the theme of Schoology Plus",
                    "Schoology Plus",
                    "select",
                    {
                        options: [
                            ...__defaultThemes.filter(
                                t => LAUSD_THEMES.includes(t.name) ? isLAUSD() : true
                            ).map(t => { return { text: t.name, value: t.name } }),
                            ...(__storage.themes || []).map(
                                t => { return { text: t.name, value: t.name } }
                            )
                        ]
                    },
                    value => {
                        tempTheme = undefined;
                        Theme.apply(Theme.active);
                        return value;
                    },
                    event => {
                        tempTheme = event.target.value;
                        Theme.apply(Theme.byName(event.target.value));
                    },
                    element => element.value
                ).control,
                new Setting(
                    "courseIcons",
                    "Override Course Icons",
                    "[Refresh required to disable] Replace the course icons with the selected theme's icons",
                    isLAUSD() ? "enabled" : "defaultOnly",
                    "select",
                    {
                        options: [
                            {
                                text: "All Icons",
                                value: "enabled"
                            },
                            {
                                text: "Default Icons Only",
                                value: "defaultOnly",
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "useDefaultIconSet",
                    "Use Built-In Icon Set",
                    `[Refresh required] Use Schoology Plus's <a href="${chrome.runtime.getURL("/default-icons.html")}" target="_blank">default course icons</a> as a fallback when a custom icon has not been specified. NOTE: these icons were meant for schools in Los Angeles Unified School District and may not work correctly for other schools.`,
                    isLAUSD() ? "enabled" : "disabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "courseIconFavicons",
                    "Use Course Icons as Favicons When Possible",
                    "[Refresh required] Use the course's icon as the favicon (the icon next to the tab's title) on most course pages. This will not work in all cases.",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "overrideUserStyles",
                    "Override Styled Text",
                    "Override styled text in homefeed posts and discussion responses when using modern themes. WARNING: This guarantees text is readable on dark theme, but removes colors and other styling that may be important. You can always use the Toggle Theme button on the navigation bar to temporarily disble your theme.",
                    "true",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "true"
                            },
                            {
                                text: "Disabled",
                                value: "false"
                            }
                        ]
                    },
                    value => {
                        document.documentElement.setAttribute("style-override", value);
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
                    element => element.value
                ).control,
                new Setting(
                    "archivedCoursesButton",
                    "Archived Courses Button",
                    'Adds a link to see past/archived courses in the courses dropdown',
                    "show",
                    "select",
                    {
                        options: [
                            {
                                text: "Show",
                                value: "show"
                            },
                            {
                                text: "Hide",
                                value: "hide"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "powerSchoolLogo",
                    "PowerSchool Logo",
                    "Controls the visibility of the PowerSchool logo on the navigation bar",
                    "block",
                    "select",
                    {
                        options: [
                            {
                                text: "Show",
                                value: "block"
                            },
                            {
                                text: "Hide",
                                value: "none"
                            }
                        ]
                    },
                    value => {
                        setCSSVariable("power-school-logo-display", value);
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
                    element => element.value
                ).control,
            ]),
            createElement("div", [], { id: "splus-settings-section-sidebar" }, [
                new Setting(
                    "indicateSubmission",
                    "Submitted Assignments Checklist",
                    '[Reload required] Shows a checkmark, shows a strikethrough, or hides items in "Upcoming Assignments" that have been submitted. If "Show Check Mark" is selected, a checklist function will be enabled allowing you to manually mark assignments as complete.',
                    "check",
                    "select",
                    {
                        options: [
                            {
                                text: "Show Check Mark ✔ (Enables manual checklist)",
                                value: "check"
                            },
                            {
                                text: "Show Strikethrough (Doesn't allow manual checklist)",
                                value: "strikethrough"
                            },
                            {
                                text: "Hide Assignment (Not recommended)",
                                value: "hide"
                            },
                            {
                                text: "Do Nothing",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "toDoIconVisibility",
                    '"Overdue" and "Due Tomorrow" Icon Visibility',
                    'Controls the visibility of the "Overdue" exclamation point icon and the "Due Tomorrow" clock icon in the Upcoming and Overdue lists on the sidebar of the homepage',
                    "visible",
                    "select",
                    {
                        options: [
                            {
                                text: "Show Icons",
                                value: "visible"
                            },
                            {
                                text: "Hide Icons",
                                value: "hidden"
                            }
                        ]
                    },
                    value => {
                        setCSSVariable("to-do-list-icons-display", "block");
                        switch (value) {
                            case "hidden":
                                setCSSVariable("to-do-list-icons-display", "none");
                                break;
                        }
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
                    element => element.value
                ).control,
                new Setting(
                    "sidebarSectionOrder",
                    "Customize Sidebar",
                    "",
                    {
                        include: [],
                        exclude: []
                    },
                    "custom",
                    {
                        element: createElement("div", [], {}, [
                            createElement("p", [], { style: { fontWeight: "normal" }, textContent: "Drag items between the sections to control which sections of the sidebar are visible and the order in which they are shown." }),
                            createElement("div", ["sortable-container"], {}, [
                                createElement("div", ["sortable-list"], {}, [
                                    createElement("h3", ["splus-underline-heading"], { textContent: "Sections to Hide" }),
                                    createElement("ul", ["sidebar-sortable", "splus-modern-border-radius", "splus-modern-padding"], { id: "sidebar-excluded-sortable" })
                                ]),
                                createElement("div", ["sortable-list"], {}, [
                                    createElement("h3", ["splus-underline-heading"], { textContent: "Sections to Show" }),
                                    createElement("ul", ["sidebar-sortable", "splus-modern-border-radius", "splus-modern-padding"], { id: "sidebar-included-sortable" })
                                ]),
                            ])
                        ]),
                    },
                    function (value, element) {
                        let includeList = element.querySelector("#sidebar-included-sortable");
                        let excludeList = element.querySelector("#sidebar-excluded-sortable");

                        includeList.innerHTML = "";
                        excludeList.innerHTML = "";

                        if (!value || !value.include || !value.exclude) {
                            value = { include: [], exclude: [] };
                        }

                        for (let section of value.include) {
                            includeList.appendChild(createElement("p", ["sortable-item", "splus-modern-border-radius", "splus-modern-padding"], { textContent: section }))
                        }

                        for (let section of value.exclude) {
                            excludeList.appendChild(createElement("p", ["sortable-item", "splus-modern-border-radius", "splus-modern-padding"], { textContent: section }))
                        }

                        for (let section of SIDEBAR_SECTIONS) {
                            if (!value.include.includes(section.name) && !value.exclude.includes(section.name)) {
                                includeList.appendChild(createElement("p", ["sortable-item", "splus-modern-border-radius", "splus-modern-padding"], { textContent: section.name }))
                            }
                        }
                    },
                    function (event) { console.log(event); },
                    element => {
                        let includeList = element.querySelector("#sidebar-included-sortable");
                        let excludeList = element.querySelector("#sidebar-excluded-sortable");

                        return {
                            include: Array.from(includeList.children).map(e => e.textContent),
                            exclude: Array.from(excludeList.children).map(e => e.textContent)
                        }
                    },
                    function () {
                        $(".sidebar-sortable").sortable({
                            connectWith: ".sidebar-sortable",
                            stop: () => Setting.onModify(this.getElement())
                        }).disableSelection();
                    }
                ).control,
            ]),
            createElement("div", [], { id: "splus-settings-section-grades" }, [
                new Setting(
                    "customScales",
                    "Custom Grading Scales",
                    "[Refresh required] Uses custom grading scales (set per-course in course settings) when courses don't have one defined",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "orderClasses",
                    "Order Classes",
                    "[Refresh required] Changes the order of your classes on the grades and mastery pages (only works if your course names contain PER N or PERIOD N)",
                    "period",
                    "select",
                    {
                        options: [
                            {
                                text: "By Period",
                                value: "period"
                            },
                            {
                                text: "Alphabetically",
                                value: "alpha"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "weightedGradebookIndicator",
                    "Weighted Gradebook Indicator",
                    "Adds an indicator next to gradebooks which are weighted",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Show",
                                value: "enabled"
                            },
                            {
                                text: "Hide",
                                value: "disabled"
                            }
                        ]
                    },
                    value => {
                        setCSSVariable("weighted-gradebook-indicator-display", value == "enabled" ? "inline" : "none")
                        return value;
                    },
                    function (event) { this.onload(event.target.value) },
                    element => element.value
                ).control,
            ]),
            createElement("div", [], { id: "splus-settings-section-utilities" }, [
                new Setting(
                    "notifications",
                    "Desktop Notifications",
                    "Displays desktop notifications and a number badge on the extension button when new grades are entered",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enable All Notifications",
                                value: "enabled"
                            },
                            {
                                text: "Number Badge Only (No Pop-Ups)",
                                value: "badge"
                            },
                            {
                                text: "Pop-Ups Only (No Badge)",
                                value: "popup"
                            },
                            {
                                text: "Disable All Notifications",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "broadcasts",
                    "Announcement Notifications",
                    "Displays news feed posts for announcements sent to all Schoology Plus users",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enable Announcements",
                                value: "enabled"
                            },
                            {
                                text: "Disable Announcements",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "autoBypassLinkRedirects",
                    "Automatically Bypass Link Redirects",
                    "Automatically skip the external link redirection page, clicking 'Continue' by default",
                    "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                new Setting(
                    "sessionCookiePersist",
                    "Stay Logged In",
                    "[Logout/login required] Stay logged in to Schoology when you restart your browser",
                    "disabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled"
                            },
                            {
                                text: "Disabled",
                                value: "disabled"
                            }
                        ]
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                createElement("div", ["setting-entry"], {}, [
                    createElement("h2", ["setting-title"], {}, [
                        createElement("a", [], { href: "#", textContent: "Change Schoology Account Access", onclick: () => { location.pathname = "/api"; }, style: { fontSize: "" } })
                    ]),
                    createElement("p", ["setting-description"], { textContent: "Grant Schoology Plus access to your Schoology API Key so many features can function, or revoke that access." })
                ]),
                getBrowser() !== "Firefox" ? createElement("div", ["setting-entry"], {}, [
                    createElement("h2", ["setting-title"], {}, [
                        createElement("a", [], { href: "#", textContent: "Anonymous Usage Statistics", onclick: () => openModal("analytics-modal"), style: { fontSize: "" } })
                    ]),
                    createElement("p", ["setting-description"], { textContent: "[Reload required] Allow Schoology Plus to collect anonymous information about how you use the extension. We don't collect any personal information per our privacy policy." })
                ]) : noControl,
            ]),
        ]),
        createElement("div", ["settings-buttons-wrapper"], undefined, [
            createButton("save-settings", "Save Settings", () => Setting.saveModified()),
            createElement("div", ["settings-actions-wrapper"], {}, [
                createElement("a", [], { textContent: "View Debug Info", onclick: () => openModal("debug-modal"), href: "#" }),
                createElement("a", [], { textContent: "Export Settings", onclick: Setting.export, href: "#" }),
                createElement("a", [], { textContent: "Import Settings", onclick: Setting.import, href: "#" }),
                createElement("a", ["restore-defaults"], { textContent: "Restore Defaults", onclick: Setting.restoreDefaults, href: "#" })
            ]),
        ])
    ]);

    if (callback && typeof callback == "function") {
        callback();
    }
}