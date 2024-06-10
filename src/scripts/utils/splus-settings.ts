import { FORCED_BETA_TEST } from "./beta";
import { Broadcast } from "./broadcast";
import { DEFAULT_THEME_NAME, EXTENSION_NAME } from "./constants";
import { DEFAULT_THEMES, LAUSD_THEMES } from "./default-themes";
import { createElement, getBrowser, setCSSVariable } from "./dom";
import { LegacySetting, SIDEBAR_SECTIONS, isLAUSD } from "./settings";
import Theme from "./theme";
import { AnySchoolgyTheme } from "./theme-model";

type HTMLElementWithValue = HTMLElement & { value: any };

class SPlusSetting<T> {
    public settingObject?: LegacySetting;
    public config: Record<string, any>;
    public onInit: (value: T, inputElement?: HTMLElementWithValue) => T;
    public onPreviewChange?: (inputElement: HTMLElementWithValue) => void;
    public onSave: (inputElement: HTMLElementWithValue) => T;
    public onShown?: () => void;

    public constructor(
        public name: string,
        public friendlyName: string,
        public description: string,
        private _defaultValue: T | (() => T),
        public controlType: "number" | "select" | "text" | "button" | "custom",
        public storageLocation: "local" | "sync",
        {
            config,
            onInit,
            onPreviewChange,
            onSave,
            onShown,
        }: {
            config?: Record<string, any>;
            onInit?: (value: T, inputElement?: HTMLElementWithValue) => T;
            onPreviewChange?: (inputElement: HTMLElementWithValue) => void;
            onSave?: (inputElement: HTMLElementWithValue) => T;
            onShown?: () => void;
        } = {}
    ) {
        this.config = config ?? {};
        this.onInit = onInit ?? (v => v);
        this.onPreviewChange = onPreviewChange;
        this.onSave = onSave ?? (el => el.value);
        this.onShown = onShown;
    }

    public initializeSetting() {
        this.settingObject = new LegacySetting(
            this.name,
            this.friendlyName,
            this.description,
            this.defaultValue,
            this.controlType,
            this.config,
            this.onInit.bind(this),
            this.onPreviewChange?.bind(this),
            this.onSave.bind(this),
            this.onShown?.bind(this),
            this.storageLocation
        );
    }

    public get settingsMenuElement(): HTMLDivElement {
        this.initializeSetting();
        return this.settingObject!.control;
    }

    public get inputElement(): HTMLElementWithValue {
        return this.settingObject!.getElement();
    }

    public get defaultValue(): T {
        return this._defaultValue instanceof Function ? this._defaultValue() : this._defaultValue;
    }

    public get value(): T {
        return LegacySetting.getValue<T>(this.name, this.storageLocation, this.defaultValue) as T;
    }

    public valueOrDefault(defaultValue: T): T {
        return LegacySetting.getValue<T>(this.name, this.storageLocation, defaultValue);
    }

    public nestedValue<K extends keyof T>(key: string, defaultValue: T[K]): T[K];
    public nestedValue<K extends keyof T>(key: string): T[K] | undefined;
    public nestedValue<K extends keyof T>(key: string, defaultValue?: T[K]): T[K] | undefined {
        return LegacySetting.getNestedValue(this.name, key, this.storageLocation, defaultValue);
    }

    public async setValue(newValue: T | undefined) {
        await LegacySetting.setValue(this.name, newValue, this.storageLocation);
    }

    public async setNestedValue<K extends keyof T>(key: string, value: T[K] | undefined) {
        await LegacySetting.setNestedValue(this.name, key, value, this.storageLocation);
    }
}

export const Settings = {
    LastLoadedVersion: new SPlusSetting<string>(
        "newVersion",
        "Last Loaded Version",
        "The version of SchoologyPlus that was last loaded",
        "",
        "text",
        "sync",
        {
            config: { disabled: true },
        }
    ),
    DefaultDomain: new SPlusSetting<string>(
        "defaultDomain",
        "Default Schoology Domain",
        `The website on which ${EXTENSION_NAME} runs. Cannot be changed here.`,
        "app.schoology.com",
        "text",
        "sync",
        {
            config: { disabled: true },
        }
    ),
    Analytics: new SPlusSetting<"enabled" | "disabled">(
        "analytics",
        "Anonymous Usage Statistics",
        `[Reload required] Allow ${EXTENSION_NAME} to collect anonymous information about how you use the extension. We don't collect any personal information per our privacy policy.`,
        () => (getBrowser() === "Firefox" ? "disabled" : "enabled"),
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Enabled", value: "enabled" },
                    { text: "Disabled", value: "disabled" },
                ],
            },
        }
    ),
    BetaCode: new SPlusSetting<string>(
        "beta",
        `${EXTENSION_NAME} βeta Code`,
        `[Reload required] Enables a beta test of a new ${EXTENSION_NAME} feature if you enter a valid code`,
        "",
        "text",
        "sync",
        {
            config: {
                disabled:
                    FORCED_BETA_TEST || LegacySetting.getValue("analytics", "sync") !== "enabled"
                        ? true
                        : undefined,
                placeholder: FORCED_BETA_TEST ? FORCED_BETA_TEST : "",
            },
        }
    ),
    ThemeEditorButton: new SPlusSetting<"Theme Editor" | undefined>(
        "themeEditor",
        "Theme Editor",
        "Click to open the theme editor to create, edit, or select a theme",
        "Theme Editor",
        "button",
        "local",
        {
            onInit: () => "Theme Editor",
            onPreviewChange: () => (location.href = chrome.runtime.getURL("/theme-editor.html")),
            onSave: () => undefined,
        }
    ),
    Theme: new SPlusSetting<string>(
        "theme",
        "Theme",
        `Change the theme of ${EXTENSION_NAME}`,
        DEFAULT_THEME_NAME,
        "select",
        "sync",
        {
            config: {
                options: [
                    ...DEFAULT_THEMES.filter(t =>
                        LAUSD_THEMES.includes(t.name) ? isLAUSD() : true
                    ).map(t => {
                        return { text: t.name, value: t.name };
                    }),
                    ...(LegacySetting.rawSyncStorage.themes || []).map((t: AnySchoolgyTheme) => {
                        return { text: t.name, value: t.name };
                    }),
                ],
            },
            onInit: value => {
                Theme.tempTheme = undefined;
                Theme.apply(Theme.active);
                return value;
            },
            onPreviewChange: el => {
                Theme.tempTheme = el.value;
                Theme.apply(Theme.byName(el.value));
            },
        }
    ),
    OverrideCourseIcons: new SPlusSetting<"enabled" | "defaultOnly" | "disabled">(
        "courseIcons",
        "Override Course Icons",
        "[Refresh required to disable] Replace the course icons with the selected theme's icons",
        () => (isLAUSD() ? "enabled" : "defaultOnly"),
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "All Icons", value: "enabled" },
                    { text: "Default Icons Only", value: "defaultOnly" },
                    { text: "Disabled", value: "disabled" },
                ],
            },
        }
    ),
    UseDefaultIcons: new SPlusSetting<"enabled" | "disabled">(
        "useDefaultIconSet",
        "Use Built-In Icon Set",
        `[Refresh required] Use ${EXTENSION_NAME}'s <a href="${chrome.runtime.getURL(
            "/default-icons.html"
        )}" target="_blank">default course icons</a> as a fallback when a custom icon has not been specified. NOTE: these icons were meant for schools in Los Angeles Unified School District and may not work correctly for other schools.`,
        () => (isLAUSD() ? "enabled" : "disabled"),
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Enabled", value: "enabled" },
                    { text: "Disabled", value: "disabled" },
                ],
            },
        }
    ),
    CourseIconFavicons: new SPlusSetting<"enabled" | "disabled">(
        "courseIconFavicons",
        "Use Course Icons as Favicons When Possible",
        "[Refresh required] Use the course's icon as the favicon (the icon next to the tab's title) on most course pages. This will not work in all cases.",
        "enabled",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Enabled", value: "enabled" },
                    { text: "Disabled", value: "disabled" },
                ],
            },
        }
    ),
    OverrideUserStyles: new SPlusSetting<"true" | "false">(
        "overrideUserStyles",
        "Override Styled Text",
        "Override styled text in homefeed posts and discussion responses when using modern themes. WARNING: This guarantees text is readable on dark theme, but removes colors and other styling that may be important. You can always use the Toggle Theme button on the navigation bar to temporarily disble your theme.",
        "true",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Enabled", value: "true" },
                    { text: "Disabled", value: "false" },
                ],
            },
            onInit: value => {
                document.documentElement.setAttribute("style-override", value);
                return value;
            },
            onPreviewChange: function (this: SPlusSetting<"true" | "false">, el) {
                this.onInit(el.value);
            },
        }
    ),
    ArchivedCoursesButton: new SPlusSetting<"show" | "hide">(
        "archivedCoursesButton",
        "Archived Courses Button",
        "Adds a link to see past/archived courses in the courses dropdown",
        "show",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Show", value: "show" },
                    { text: "Hide", value: "hide" },
                ],
            },
        }
    ),
    PowerSchoolLogo: new SPlusSetting<string>(
        "powerSchoolLogo",
        "PowerSchool Logo",
        "Controls the visibility of the PowerSchool logo on the navigation bar",
        "block",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Show", value: "block" },
                    { text: "Hide", value: "none" },
                ],
            },
            onInit: value => {
                setCSSVariable("power-school-logo-display", value);
                return value;
            },
            onPreviewChange: function (this: SPlusSetting<string>, el) {
                this.onInit(el.value);
            },
        }
    ),
    IndicateSubmittedAssignments: new SPlusSetting<"check" | "strikethrough" | "hide" | "disabled">(
        "indicateSubmission",
        "Submitted Assignments Checklist",
        '[Reload required] Shows a checkmark, shows a strikethrough, or hides items in "Upcoming Assignments" that have been submitted. If "Show Check Mark" is selected, a checklist function will be enabled allowing you to manually mark assignments as complete.',
        "check",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Show Check Mark ✔ (Enables manual checklist)", value: "check" },
                    {
                        text: "Show Strikethrough (Doesn't allow manual checklist)",
                        value: "strikethrough",
                    },
                    { text: "Hide Assignment (Not recommended)", value: "hide" },
                    { text: "Do Nothing", value: "disabled" },
                ],
            },
        }
    ),
    ToDoIconVisibility: new SPlusSetting<"visible" | "hidden">(
        "toDoIconVisibility",
        '"Overdue" and "Due Tomorrow" Icon Visibility',
        'Controls the visibility of the "Overdue" exclamation point icon and the "Due Tomorrow" clock icon in the Upcoming and Overdue lists on the sidebar of the homepage',
        "visible",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Visible", value: "visible" },
                    { text: "Hidden", value: "hidden" },
                ],
            },
            onInit: value => {
                setCSSVariable("to-do-list-icons-display", "block");
                switch (value) {
                    case "hidden":
                        setCSSVariable("to-do-list-icons-display", "none");
                        break;
                }
                return value;
            },
            onPreviewChange: function (this: SPlusSetting<"visible" | "hidden">, el) {
                this.onInit(el.value);
            },
        }
    ),
    CustomGradingScales: new SPlusSetting<"enabled" | "disabled">(
        "customScales",
        "Custom Grading Scales",
        "[Refresh required] Uses custom grading scales (set per-course in course settings) when courses don't have one defined",
        "enabled",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Enabled", value: "enabled" },
                    { text: "Disabled", value: "disabled" },
                ],
            },
        }
    ),
    CourseOrderMethod: new SPlusSetting<"period" | "alpha">(
        "orderClasses",
        "Order Classes",
        "[Refresh required] Changes the order of your classes on the grades and mastery pages (only works if your course names contain PER N or PERIOD N)",
        "period",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "By Period", value: "period" },
                    { text: "Alphabetical", value: "alpha" },
                ],
            },
        }
    ),
    WeightedGradebookIndicator: new SPlusSetting<"enabled" | "disabled">(
        "weightedGradebookIndicator",
        "Weighted Gradebook Indicator",
        "Adds an indicator next to gradebooks which are weighted",
        "enabled",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Show", value: "enabled" },
                    { text: "Hide", value: "disabled" },
                ],
            },
            onInit: value => {
                setCSSVariable(
                    "weighted-gradebook-indicator-display",
                    value == "enabled" ? "inline" : "none"
                );
                return value;
            },
            onPreviewChange: function (
                this: SPlusSetting<"enabled" | "disabled">,
                element: HTMLElementWithValue
            ) {
                this.onInit(element.value);
            },
        }
    ),
    DesktopNotifications: new SPlusSetting<"enabled" | "badge" | "popup" | "disabled">(
        "notifications",
        "Desktop Notifications",
        "Displays desktop notifications and a number badge on the extension button when new grades are entered",
        "enabled",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Enable All Notifications", value: "enabled" },
                    { text: "Number Badge Only (No Pop-Ups)", value: "badge" },
                    { text: "Pop-Ups Only (No Badge)", value: "popup" },
                    { text: "Disable All Notifications", value: "disabled" },
                ],
            },
        }
    ),
    Broadcasts: new SPlusSetting<"enabled" | "disabled">(
        "broadcasts",
        "Announcement Notifications",
        `Displays news feed posts for announcements sent to all ${EXTENSION_NAME} users`,
        "enabled",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Enabled", value: "enabled" },
                    { text: "Disabled", value: "disabled" },
                ],
            },
        }
    ),
    BypassLinkRedirects: new SPlusSetting<"enabled" | "disabled">(
        "autoBypassLinkRedirects",
        "Automatically Bypass Link Redirects",
        "Automatically skip the external link redirection page, clicking 'Continue' by default",
        "enabled",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Enabled", value: "enabled" },
                    { text: "Disabled", value: "disabled" },
                ],
            },
        }
    ),
    PersistSessionCookies: new SPlusSetting<"enabled" | "disabled">(
        "sessionCookiePersist",
        "Stay Logged In",
        "[Logout/login required] Stay logged in to Schoology when you restart your browser",
        "disabled",
        "select",
        "sync",
        {
            config: {
                options: [
                    { text: "Enabled", value: "enabled" },
                    { text: "Disabled", value: "disabled" },
                ],
            },
        }
    ),
    SidebarSectionOrder: new SPlusSetting<{ include: string[]; exclude: string[] }>(
        "sidebarSectionOrder",
        "Customize Sidebar",
        "",
        { include: [], exclude: [] },
        "custom",
        "sync",
        {
            onInit: function (value, element) {
                if (!element) {
                    throw new Error("SidebarSectionOrder element not found");
                }
                element.innerHTML = "";

                element.appendChild(
                    createElement("p", [], {
                        style: { fontWeight: "normal" },
                        textContent:
                            "Drag items between the sections to control which sections of the sidebar are visible and the order in which they are shown.",
                    })
                );
                element.appendChild(
                    createElement("div", ["sortable-container"], {}, [
                        createElement("div", ["sortable-list"], {}, [
                            createElement("h3", ["splus-underline-heading"], {
                                textContent: "Sections to Hide",
                            }),
                            createElement(
                                "ul",
                                [
                                    "sidebar-sortable",
                                    "splus-modern-border-radius",
                                    "splus-modern-padding",
                                ],
                                { id: "sidebar-excluded-sortable" }
                            ),
                        ]),
                        createElement("div", ["sortable-list"], {}, [
                            createElement("h3", ["splus-underline-heading"], {
                                textContent: "Sections to Show",
                            }),
                            createElement(
                                "ul",
                                [
                                    "sidebar-sortable",
                                    "splus-modern-border-radius",
                                    "splus-modern-padding",
                                ],
                                { id: "sidebar-included-sortable" }
                            ),
                        ]),
                    ])
                );

                let includeList = element?.querySelector("#sidebar-included-sortable")!;
                let excludeList = element?.querySelector("#sidebar-excluded-sortable")!;

                includeList.innerHTML = "";
                excludeList.innerHTML = "";

                if (!value || !value.include || !value.exclude) {
                    value = { include: [], exclude: [] };
                }

                for (let section of value.include) {
                    includeList.appendChild(
                        createElement(
                            "p",
                            ["sortable-item", "splus-modern-border-radius", "splus-modern-padding"],
                            { textContent: section }
                        )
                    );
                }

                for (let section of value.exclude) {
                    excludeList.appendChild(
                        createElement(
                            "p",
                            ["sortable-item", "splus-modern-border-radius", "splus-modern-padding"],
                            { textContent: section }
                        )
                    );
                }

                for (let section of SIDEBAR_SECTIONS) {
                    if (
                        !value.include.includes(section.name) &&
                        !value.exclude.includes(section.name)
                    ) {
                        includeList.appendChild(
                            createElement(
                                "p",
                                [
                                    "sortable-item",
                                    "splus-modern-border-radius",
                                    "splus-modern-padding",
                                ],
                                { textContent: section.name }
                            )
                        );
                    }
                }

                return value;
            },
            onSave: element => {
                let includeList = element.querySelector("#sidebar-included-sortable")!;
                let excludeList = element.querySelector("#sidebar-excluded-sortable")!;

                return {
                    include: Array.from(includeList.children).map(e => e.textContent!),
                    exclude: Array.from(excludeList.children).map(e => e.textContent!),
                };
            },
            onShown: function (this: SPlusSetting<{ include: string[]; exclude: string[] }>) {
                $(".sidebar-sortable").sortable({
                    connectWith: ".sidebar-sortable",
                    stop: () => LegacySetting.onModify(this.inputElement),
                });
            },
        }
    ),
    ForceDefaultCourseIcons: new SPlusSetting<Record<string, "enabled" | "disabled">>(
        "forceDefaultCourseIcons",
        "Force Default Course Icons",
        "",
        {},
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
            onInit: v => JSON.stringify(v) as any,
        }
    ),
    Popups: new SPlusSetting<Record<string, boolean>>("popup", "Popups", "", {}, "text", "local", {
        config: {
            disabled: true,
        },
        onInit: v => JSON.stringify(v) as any,
    }),
    CourseNicknames: new SPlusSetting<Record<string, string>>(
        "courseAliases",
        "Course Nicknames",
        "",
        {},
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
            onInit: v => JSON.stringify(v) as any,
        }
    ),
    CourseQuickLinks: new SPlusSetting<Record<string, string>>(
        "courseQuickLinks",
        "Course Quick Links",
        "",
        {},
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
            onInit: v => JSON.stringify(v) as any,
        }
    ),
    CourseGradingScales: new SPlusSetting<Record<string, Record<string, string>>>(
        "gradingScales",
        "Custom Grading Scales",
        "",
        {},
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
            onInit: v => JSON.stringify(v) as any,
        }
    ),
    DefaultGradingScale: new SPlusSetting<Record<string, string>>(
        "defaultGradingScale",
        "Default Grading Scale",
        "",
        {},
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
            onInit: v => JSON.stringify(v) as any,
        }
    ),
    UnreadBroadcasts: new SPlusSetting<Broadcast[]>(
        "unreadBroadcasts",
        `Unread ${EXTENSION_NAME} Announcements`,
        "",
        [],
        "text",
        "local",
        {
            config: {
                disabled: true,
            },
            onInit: v => JSON.stringify(v) as any,
        }
    ),
    Themes: new SPlusSetting<AnySchoolgyTheme[]>(
        "themes",
        "All Custom Themes",
        "",
        [],
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
            onInit: v => JSON.stringify(v) as any,
        }
    ),
    AssignmentCompletionOverrides: new SPlusSetting<Record<string, boolean>>(
        "assignmentCompletionOverrides",
        "Assignment Completion Overrides",
        "",
        {},
        "text",
        "local",
        {
            config: {
                disabled: true,
            },
            onInit: v => JSON.stringify(v) as any,
        }
    ),
    MissingIconsLastCheck: new SPlusSetting<number>(
        "missingIconsLastCheck",
        "Last Checked for Missing Course Icons",
        "",
        0,
        "text",
        "local",
        {
            config: {
                disabled: true,
            },
        }
    ),
    ApiKey: new SPlusSetting<string | undefined>(
        "apikey",
        "API Key",
        "The API key for the Schoology API",
        undefined,
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
        }
    ),
    ApiSecret: new SPlusSetting<string | undefined>(
        "apisecret",
        "API Secret",
        "The API secret for the Schoology API",
        undefined,
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
        }
    ),
    ApiUser: new SPlusSetting<number | undefined>(
        "apiuser",
        "API User",
        "The User ID for the Schoology API",
        undefined,
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
        }
    ),
    ApiStatus: new SPlusSetting<"allowed" | "denied" | "blocked" | undefined>(
        "apiStatus",
        "API Status",
        "The status of the API",
        undefined,
        "text",
        "sync",
        {
            config: {
                disabled: true,
            },
        }
    ),
};
