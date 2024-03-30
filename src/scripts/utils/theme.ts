import browser from "webextension-polyfill";

import { DEFAULT_ICONS } from "./default-icons";
import { DEFAULT_THEMES } from "./default-themes";
import { setCSSVariable } from "./dom";
import { Setting, isLAUSD } from "./settings";
import {
    AnySchoolgyTheme,
    ModernColorDefinition,
    RainbowColorComponentAnimation,
    SchoologyThemeV2,
} from "./theme-model";
import { createToastButton, showToast } from "./toast";
import { InterfaceOf } from "./types";

interface ThemeProfilePictureOverride {
    regex: string;
    url: string;
}

var defaultCourseIconUrlRegex =
    /\/sites\/[a-zA-Z0-9_-]+\/themes\/[%a-zA-Z0-9_-]+\/images\/course-default.(?:svg|png|jpe?g|gif)(\?[a-zA-Z0-9_%-]+(=[a-zA-Z0-9_%-]+)?(&[a-zA-Z0-9_%-]+(=[a-zA-Z0-9_%-]+)?)*)?$/;

let themeIconLoadElementContainer = document.createElement("div");
themeIconLoadElementContainer.style.display = "none";

let shownMissingIconsNotification = false;
const ICON_REQUEST_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSe-v0vRE4Obwkx6iL37aztz3kmpqYBBVxKEsdVxu8CZqk1OCQ/viewform?entry.50164059=";

setInterval(() => {
    if (Theme.active.onupdate) {
        Theme.active.onupdate();
    }
}, 100);

export default class Theme {
    name: string;
    onapply: () => void;
    onupdate?: () => void;

    static profilePictureOverrides: ThemeProfilePictureOverride[] = [];
    static tempTheme: string | undefined = undefined;
    static themes: (Theme | null)[] = DEFAULT_THEMES.map(Theme.loadFromObject);

    constructor(name: string, onApply: () => void, onUpdate?: () => void) {
        this.name = name;
        this.onapply = onApply;
        this.onupdate = onUpdate;
    }

    static setModernEnabled(enabled: boolean) {
        document.documentElement.setAttribute("modern", enabled.toString());
    }

    static getIcon(course: string): string | null {
        for (let overridePattern of Theme.profilePictureOverrides) {
            if (course.match(new RegExp(overridePattern.regex, "i"))) {
                return overridePattern.url;
            }
        }

        let t = Setting.getValue<AnySchoolgyTheme[]>("themes", []).find(
            x => x.name === Theme.active.name
        );
        if (t && t.icons && t.icons instanceof Array) {
            for (let iconPattern of t.icons) {
                let regex = Array.isArray(iconPattern)
                    ? new RegExp(iconPattern[0], "i")
                    : new RegExp(iconPattern.regex, "i");

                if (course.match(regex)) {
                    return Array.isArray(iconPattern) ? iconPattern[1] : iconPattern.url;
                }
            }
        }

        // Default icons only if enabled
        if (Setting.getValue("useDefaultIconSet") === "enabled") {
            for (let iconPattern of DEFAULT_ICONS) {
                if (course.match(new RegExp(iconPattern.regex, "i"))) {
                    return iconPattern.url;
                }
            }
        }

        return null;
    }

    static hasBuiltInIcon(course?: string): boolean {
        for (let iconPattern of DEFAULT_ICONS) {
            if (iconPattern.regex != "." && course?.match(new RegExp(iconPattern.regex, "i"))) {
                return true;
            }
        }
        return false;
    }

    static loadFromObject(theme: AnySchoolgyTheme) {
        function createOnApply() {
            switch (theme.version) {
                case 2:
                    return () => {
                        if (theme.color.hue) {
                            Theme.setBackgroundHue(theme.color.hue);
                        } else if (theme.color.custom) {
                            Theme.setBackgroundColor(
                                theme.color.custom.primary,
                                theme.color.custom.background,
                                theme.color.custom.hover,
                                theme.color.custom.border,
                                theme.color.custom.link
                            );
                        }

                        Theme.setModernEnabled(!!theme.color.modern);
                        if (theme.color.modern) {
                            Theme.setModernColors(theme.color.modern);
                        }

                        if (!theme.logo) {
                            theme.logo = { preset: "schoology_plus" };
                        }
                        Theme.setDefaultLogoVisibility(false);
                        if (theme.logo.url) {
                            Theme.setLogoUrl(theme.logo.url);
                        } else
                            switch (theme.logo.preset) {
                                case "schoology_plus":
                                    Theme.setLogoUrl(
                                        browser.runtime.getURL("/imgs/schoology-plus-wide.svg")
                                    );
                                    break;
                                case "schoology_logo":
                                    Theme.setLogoUrl();
                                    break;
                                case "lausd_legacy":
                                    Theme.setLogoUrl(
                                        browser.runtime.getURL("/imgs/lausd-legacy.png")
                                    );
                                    break;
                                case "lausd_2022":
                                    Theme.setLogoUrl(
                                        browser.runtime.getURL("/imgs/lausd-2022.png")
                                    );
                                    break;
                                case "lausd_2019":
                                    Theme.setLogoUrl(
                                        browser.runtime.getURL("/imgs/lausd-2019.png")
                                    );
                                    break;
                                case "default":
                                    Theme.setDefaultLogoVisibility(true);
                                    break;
                            }

                        if (theme.cursor) {
                            Theme.setCursorUrl(theme.cursor.primary);
                        }
                    };
                default:
                    return () => {
                        Theme.setBackgroundHue(theme.hue);
                        if (theme.colors) {
                            Theme.setBackgroundColor(
                                theme.colors[0],
                                theme.colors[1],
                                theme.colors[2],
                                theme.colors[3]
                            );
                        }
                        Theme.setCursorUrl(theme.cursor);
                        theme.logo = theme.logo || "schoology";
                        switch (theme.logo) {
                            case "schoology":
                                Theme.setLogoUrl();
                                break;
                            case "lausd":
                                Theme.setLogoUrl(browser.runtime.getURL("/imgs/lausd-legacy.png"));
                                break;
                            case "lausd_new":
                                Theme.setLogoUrl(browser.runtime.getURL("/imgs/lausd-2019.png"));
                                break;
                            default:
                                Theme.setLogoUrl(theme.logo);
                        }
                    };
            }
        }

        function createOnUpdate() {
            if (theme.color && theme.color.rainbow) {
                return () => {
                    let hue: number | undefined = 0;
                    let saturation: number | undefined = 0;
                    let lightness: number | undefined = 0;
                    let time = new Date().valueOf();

                    if (
                        !theme.color.rainbow ||
                        !theme.color.rainbow.hue ||
                        !theme.color.rainbow.saturation ||
                        !theme.color.rainbow.lightness
                    )
                        return;

                    // Equation for time-based hue, saturation, lightness:
                    // hue = (((time / (150 - speed)) + offset) % (alternate ? range * 2 : range)) + min
                    // if alternate and hue > max: hue = max - (hue - max)

                    if (theme.color.rainbow.hue.animate) {
                        let o = theme.color.rainbow.hue.animate;

                        if (o.max < o.min) {
                            o.max += 360;
                        }

                        hue = getComponentValue(o, time);
                    } else {
                        hue = theme.color.rainbow.hue.value;
                    }
                    if (theme.color.rainbow.saturation.animate) {
                        saturation = getComponentValue(
                            theme.color.rainbow.saturation.animate,
                            time
                        );
                    } else {
                        saturation = theme.color.rainbow.saturation.value;
                    }
                    if (theme.color.rainbow.lightness.animate) {
                        lightness = getComponentValue(theme.color.rainbow.lightness.animate, time);
                    } else {
                        lightness = theme.color.rainbow.lightness.value;
                    }

                    Theme.setBackgroundHue(hue, saturation, lightness);
                };
            }
            return undefined;

            function getComponentValue(
                animateObject: InterfaceOf<RainbowColorComponentAnimation>,
                time: number
            ) {
                let { speed, offset, alternate, min, max } = animateObject;
                let range = max - min;
                let v = ((time / (150 - speed) + +offset) % (alternate ? range * 2 : range)) + min;
                if (alternate && v > max) {
                    v = max - (v - max);
                }
                return v;
            }
        }

        if (!theme.version) return null;
        return new Theme(theme.name, createOnApply(), createOnUpdate());
    }

    static apply(theme: Theme) {
        Theme.setBackgroundHue(210);
        Theme.setCursorUrl();
        Theme.setDefaultLogoVisibility(false);
        Theme.setLogoUrl();
        theme.onapply();
        Theme.setProfilePictures();
    }

    static get active(): Theme {
        return Theme.tempTheme
            ? Theme.byName(Theme.tempTheme)
            : Theme.byName(Setting.getValue<string>("theme")) || Theme.byName("Schoology Plus");
    }

    static byName(name?: string): Theme {
        return Theme.themes.find(x => x?.name == name) || Theme.byName("Schoology Plus");
    }

    static setBackgroundColor(
        primaryColor?: string,
        backgroundColor?: string,
        hoverColor?: string,
        borderColor?: string,
        linkColor = hoverColor
    ) {
        if (primaryColor && backgroundColor && hoverColor && borderColor) {
            document.documentElement.style.setProperty("--primary-color", primaryColor);
            document.documentElement.style.setProperty("--background-color", backgroundColor);
            document.documentElement.style.setProperty("--hover-color", hoverColor);
            document.documentElement.style.setProperty("--border-color", borderColor);
            document.documentElement.style.setProperty("--link-color", linkColor!);
        }
    }

    static setBackgroundHue(hue: number | undefined, saturation?: number, lightness?: number) {
        if (hue && !saturation && !lightness) {
            document.documentElement.style.setProperty("--color-hue", hue.toString());
            document.documentElement.style.setProperty(
                "--primary-color",
                "hsl(var(--color-hue), 50%, 50%)"
            );
            document.documentElement.style.setProperty(
                "--background-color",
                "hsl(var(--color-hue), 60%, 30%)"
            );
            document.documentElement.style.setProperty(
                "--hover-color",
                "hsl(var(--color-hue), 55%, 40%)"
            );
            document.documentElement.style.setProperty(
                "--border-color",
                "hsl(var(--color-hue), 60%, 25%)"
            );
            document.documentElement.style.setProperty(
                "--link-color",
                "hsl(var(--color-hue), 55%, 40%)"
            );
        } else if (hue) {
            document.documentElement.style.setProperty("--color-hue", hue.toString());
            document.documentElement.style.setProperty(
                "--primary-color",
                `hsl(var(--color-hue), ${saturation}%, ${lightness}%)`
            );
            document.documentElement.style.setProperty(
                "--background-color",
                "hsl(var(--color-hue), 60%, 30%)"
            );
            document.documentElement.style.setProperty(
                "--hover-color",
                "hsl(var(--color-hue), 55%, 40%)"
            );
            document.documentElement.style.setProperty(
                "--border-color",
                "hsl(var(--color-hue), 60%, 25%)"
            );
            document.documentElement.style.setProperty(
                "--link-color",
                "hsl(var(--color-hue), 55%, 40%)"
            );
        }
    }

    static setModernColors(m: Pick<ModernColorDefinition, keyof ModernColorDefinition>) {
        setCSSVariable("theme-is-dark", (m.dark ? 1 : 0).toString());
        document.documentElement.setAttribute("dark", m.dark ? "true" : "false");

        // Interface Colors
        if (m.interface) {
            setCSSVariable("primary", m.interface.primary);
            setCSSVariable("accent", m.interface.accent);
            setCSSVariable("secondary", m.interface.secondary);
            setCSSVariable("input", m.interface.input);
            setCSSVariable("contrast-border", m.interface.border);
            setCSSVariable("highlight", m.interface.highlight);
            setCSSVariable("active", m.interface.active);
            setCSSVariable("grades", m.interface.grades);
            setCSSVariable("error", m.interface.error);
        }

        if (m.calendar) {
            // Calendar Colors
            for (let i = 0; i < Math.min(30, m.calendar.length); i++) {
                setCSSVariable(`cal${i + 1}`, m.calendar[i]);
            }
        }

        if (m.text) {
            // Text Colors
            setCSSVariable("text", m.text.primary);
            setCSSVariable("muted-text", m.text.muted);
            setCSSVariable("contrast-text", m.text.contrast);
        }

        if (m.options) {
            // Options
            setCSSVariable("border-radius", `${m.options.borderRadius}px`);
            setCSSVariable("border-size", `${m.options.borderSize}px`);
            setCSSVariable("padding", `${m.options.padding}px`);
        }
    }

    static setProfilePictures(candidateImages?: HTMLCollectionOf<HTMLImageElement>) {
        if (Setting.getValue("courseIcons") === "disabled") return;
        // whether or not to skip setting themed icons where the teacher has already set one
        let skipOverriddenIcons = Setting.getValue("courseIcons") === "defaultOnly";
        let pictures: HTMLImageElement[] = [];
        if (candidateImages) {
            if (!skipOverriddenIcons) {
                pictures = Array.from(candidateImages);
            } else {
                pictures = Array.from(candidateImages).filter(x =>
                    x.src.match(defaultCourseIconUrlRegex)
                );
            }
        }
        //Course profile picture on course page
        let bigCourseIcon = document.querySelector<HTMLImageElement>(
            ".profile-picture-wrapper.sCourse-processed .profile-picture>img"
        );
        if (
            skipOverriddenIcons &&
            bigCourseIcon &&
            !bigCourseIcon.src.match(defaultCourseIconUrlRegex)
        )
            bigCourseIcon = null;
        if (bigCourseIcon) pictures.push(bigCourseIcon);
        //List of courses on user page
        //Note that the modal popup also uses this class
        let coursesList = document.querySelectorAll(".my-courses-item-list");
        if (coursesList && coursesList.length > 0) {
            let courseImgs = [];
            for (let c of Array.from(coursesList).reduce(
                (accum: Element[], curr) =>
                    accum.concat(Array.from(curr.querySelectorAll(".course-item"))),
                []
            )) {
                let img = c.querySelector<HTMLImageElement>(".profile-picture>img");
                if (!img) {
                    continue;
                } else if (skipOverriddenIcons && !img.src.match(defaultCourseIconUrlRegex)) {
                    continue;
                }
                img.alt = "Profile picture for " + c.textContent;
                courseImgs.push(img);
            }
            pictures = pictures.concat(courseImgs);
        }

        let arrows = Array.from(
            document.querySelectorAll<HTMLElement>(
                ".gradebook-course-title .arrow:not(.icon-modified), .splus-course-icon:not(.icon-modified)"
            )
        );

        for (let arrow of arrows) {
            arrow.dataset.themedIconMode = "gradesPageArrow";
        }

        // courses drop down icons
        let coursesDropDownIcons = document.querySelectorAll<HTMLElement>(
            ".splus-courses-navbar-button ._1tpub.Kluyr a.Card-card-1Qd8e .Card-card-image-uV6Bu"
        );

        for (let cDropIcon of coursesDropDownIcons) {
            cDropIcon.dataset.themedIconMode = "coursesDropDown";
            let cDropLink = cDropIcon.parentElement!;
            // course + section titles
            let courseTitle = cDropLink.querySelector(
                ".Card-card-data-17m6S div:not(.splus-coursesdropdown-nicknamed-dataset) ._3U8Br._2s0LQ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB"
            );
            if (!courseTitle) {
                continue;
            }
            let sectionTitle = cDropLink.querySelector(
                ".Card-card-data-17m6S div:not(.splus-coursesdropdown-nicknamed-dataset) ._1wP6w._23_WZ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB"
            );
            if (!sectionTitle) {
                continue;
            }
            cDropIcon.dataset.courseTitle = `${courseTitle.textContent}: ${sectionTitle?.textContent}`;

            let existingUrl = cDropIcon.style.backgroundImage.slice(4, -1).replace(/"/g, "");
            if (!skipOverriddenIcons || existingUrl.match(defaultCourseIconUrlRegex)) {
                arrows.push(cDropIcon);
            }
        }

        let missingIconsLastCheck = Setting.getValue<number>("missingIconsLastCheck");
        let coursesMissingDefaultIcons = new Set<string | undefined>();

        for (let arrow of arrows) {
            arrow.classList.add("icon-modified");
            // fallbacks don't work in CSS
            // implement our own thing for it, based on img and onerror
            let sourceUrl = Theme.getIcon(
                arrow.dataset.courseTitle || arrow.parentElement!.textContent!
            );
            let fallbackUrl = browser.runtime.getURL("imgs/fallback-course-icon.svg");
            let matches = sourceUrl && sourceUrl.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            let domain = matches && matches[1];

            if (!domain) {
                sourceUrl = fallbackUrl;
            } else {
                let containerImg: HTMLImageElement | null = null;
                for (let imgTester of themeIconLoadElementContainer.children as HTMLCollectionOf<HTMLImageElement>) {
                    if (imgTester.dataset.domain == domain) {
                        // this is our test element
                        containerImg = imgTester;
                        break;
                    }
                }
                if (!containerImg) {
                    containerImg = document.createElement("img");
                    containerImg.dataset.domain = domain;
                    themeIconLoadElementContainer.appendChild(containerImg);
                }
                if (containerImg.dataset.result && containerImg.dataset.result == "fail") {
                    // already tried loading this domain and it failed
                    sourceUrl = fallbackUrl;
                } else if (!containerImg.dataset.result) {
                    // loading not yet completed (already succeeded would have result set)
                    // no action required if already succeeded

                    let existingOnError = containerImg.onerror;
                    containerImg.onerror = function (p1, p2, p3) {
                        if (existingOnError) {
                            // call whatever's before us
                            existingOnError(p1, p2, p3);
                        } else {
                            // we're first, wipe onerror
                            containerImg!.dataset.result = "fail";
                            containerImg!.onerror = null;
                        }

                        // in case this gets called before we get through the rest of this method, somehow
                        sourceUrl = fallbackUrl;

                        if (arrow.dataset.themedIconMode == "gradesPageArrow") {
                            arrow.setAttribute(
                                "style",
                                `background: url(${fallbackUrl}) no-repeat 0; background-size: cover;`
                            );
                        } else if (arrow.dataset.themedIconMode == "coursesDropDown") {
                            arrow.setAttribute(
                                "style",
                                `background-image: url(${fallbackUrl}); background-size: contain;`
                            );
                        }
                    };

                    if (!containerImg.src) {
                        // not yet attempted
                        containerImg.onload = function () {
                            containerImg!.onload = null;
                            containerImg!.dataset.result = "success";
                        };

                        if (sourceUrl && containerImg.src != sourceUrl) {
                            containerImg.src = sourceUrl;
                        }
                    }
                }
            }

            if (arrow.dataset.themedIconMode == "gradesPageArrow") {
                arrow.setAttribute(
                    "style",
                    `background: url(${sourceUrl}) no-repeat 0; background-size: cover;`
                );
            } else if (arrow.dataset.themedIconMode == "coursesDropDown") {
                arrow.setAttribute(
                    "style",
                    `background-image: url(${sourceUrl}); background-size: contain;`
                );
            }

            // ***** Tracking courses missing icons
            if (
                (!missingIconsLastCheck || beforeThisSemester(missingIconsLastCheck)) &&
                !Theme.hasBuiltInIcon(
                    arrow.dataset.courseTitle || arrow.parentElement?.textContent || undefined
                )
            ) {
                coursesMissingDefaultIcons.add(
                    arrow.dataset.courseTitle || arrow.parentElement?.textContent || undefined
                );
            }
            // *****
        }

        for (let img of pictures) {
            img.onerror = function () {
                // avoid infinite recursion
                img.onerror = null;
                img.src = browser.runtime.getURL("imgs/fallback-course-icon.svg");
                img.classList.add("splus-loaderror");
            };
            let customSrc = Theme.getIcon(img.alt);
            if (img.src !== customSrc) {
                img.src = `${customSrc}`;
            }
            img.classList.add("injected-course-icon");

            if (
                Setting.getValue("courseIconFavicons") !== "disabled" &&
                img == bigCourseIcon &&
                !document.querySelector("head > link[rel='icon'][type='image/svg+xml']")
            ) {
                document.querySelectorAll("link[rel='shortcut icon']").forEach(el => el.remove());
                let favicon = document.createElement("link");
                favicon.rel = "icon";
                favicon.type =
                    !customSrc || customSrc.endsWith(".svg") ? "image/svg+xml" : "image/png";
                favicon.href = customSrc || browser.runtime.getURL("imgs/fallback-course-icon.svg");
                document.head.appendChild(favicon);
            }
        }

        if (
            isLAUSD() &&
            !shownMissingIconsNotification &&
            coursesMissingDefaultIcons.size > 0 &&
            showToast
        ) {
            let coursesString = encodeURI(
                Array.from(coursesMissingDefaultIcons).join("\n").replace("&", "{amp;}")
            );
            showToast(
                "Request New Course Icons?",
                `${coursesMissingDefaultIcons.size} ${
                    coursesMissingDefaultIcons.size == 1
                        ? "course is missing a Schoology Plus course icon. Would you like to request that an icon be added for this course?"
                        : "courses are missing Schoology Plus course icons. Would you like to request that icons be added for these courses?"
                }`,
                "yellow",
                {
                    buttons: [
                        createToastButton("Yes", "suggest-icons-button", () =>
                            window.open(`${ICON_REQUEST_URL}${coursesString}`, "_blank")
                        ),
                        createToastButton("No", "nothing-button", () =>
                            showToast(
                                "You can request icons later from course options",
                                "",
                                "hsl(190, 100%, 50%)",
                                { timeout: 5000 }
                            )
                        ),
                    ],
                }
            );
            shownMissingIconsNotification = true;
            Setting.setValue("missingIconsLastCheck", new Date().valueOf());
        }
    }

    static setDefaultLogoVisibility(visible?: boolean) {
        // False: show Schoology/custom logo; True: show LAUSD logo
        if (visible) {
            document.documentElement.classList.remove("use-custom-url");
        } else {
            document.documentElement.classList.add("use-custom-url");
        }
    }

    static setLogoUrl(
        url = "https://ui.schoology.com/design-system/assets/schoology-logo-horizontal-white.884fbe559c66e06d28c5cfcbd4044f0e.svg"
    ) {
        setCSSVariable("background-url", `url(${url})`);
    }

    static setCursorUrl(url?: string) {
        document.documentElement.style.setProperty("--cursor", url ? `url(${url}), auto` : "auto");
    }
}

/**
 * Returns true if the date specified is in a semester prior to the current semester
 * @param {Date|number} oldDate The date to check
 */
function beforeThisSemester(oldDate: Date | number) {
    let curr = getSemester(new Date());
    let prev = getSemester(new Date(oldDate));
    if (
        prev.year < curr.year ||
        (prev.year === curr.year && prev.semester !== curr.semester && prev.semester === "Spring")
    ) {
        return true;
    }
    return false;

    function getSemester(date: Date) {
        let m = date.getMonth();
        let y = date.getFullYear();
        return { semester: m > 0 && m < 8 ? "Spring" : "Fall", year: m == 0 ? y - 1 : y };
    }
}
