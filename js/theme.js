// an img per domain
// to check if images load
let themeIconLoadElementContainer = document.createElement("div");
themeIconLoadElementContainer.style.display = "none";

let shownMissingIconsNotification = false;
const ICON_REQUEST_URL = "https://docs.google.com/forms/d/e/1FAIpQLSe-v0vRE4Obwkx6iL37aztz3kmpqYBBVxKEsdVxu8CZqk1OCQ/viewform?entry.50164059=";

class Theme {
    constructor(name, onApply, onUpdate) {
        this.name = name;
        this.onapply = onApply;
        this.onupdate = onUpdate;
    }

    static setModernEnabled(enabled) {
        document.documentElement.setAttribute("modern", enabled);
    }

    static getIcon(course) {
        for (let overridePattern of Theme.profilePictureOverrides) {
            if (course.match(new RegExp(overridePattern.regex, 'i'))) {
                return overridePattern.url;
            }
        }

        if (Setting.getValue("themes")) {
            let t = Setting.getValue("themes").find(x => x.name === Theme.active.name);
            if (t && t.icons && t.icons instanceof Array) {
                let regexProp, urlProp;
                switch (t.version) {
                    case 2:
                        regexProp = "regex";
                        urlProp = "url";
                        break;
                    default:
                        regexProp = 0;
                        urlProp = 1;
                        break;
                }
                for (let iconPattern of t.icons) {
                    if (course.match(new RegExp(iconPattern[regexProp], 'i'))) {
                        return iconPattern[urlProp];
                    }
                }
            }
        }

        // Default icons are for LAUSD only
        if (isLAUSD()) {
            for (let iconPattern of icons) {
                if (course.match(new RegExp(iconPattern.regex, 'i'))) {
                    return iconPattern.url;
                }
            }
        }

        return null;
    }

    static hasBuiltInIcon(course) {
        for (let iconPattern of icons) {
            if (iconPattern.regex != "." && course.match(new RegExp(iconPattern.regex, 'i'))) {
                return true;
            }
        }
        return false;
    }

    static loadFromObject(theme) {
        function createOnApply() {
            switch (theme.version) {
                case 2:
                    return () => {
                        if (theme.color.hue) {
                            Theme.setBackgroundHue(theme.color.hue);
                        } else if (theme.color.custom) {
                            Theme.setBackgroundColor(theme.color.custom.primary, theme.color.custom.background, theme.color.custom.hover, theme.color.custom.border);
                        }

                        Theme.setModernEnabled(!!theme.color.modern);
                        if (theme.color.modern) {
                            Logger.log("Enabled modern");
                            // TODO: set up ALL the variables
                        }

                        if (!theme.logo) {
                            theme.logo = { preset: "schoology_plus" };
                        }
                        Theme.setDefaultLogoVisibility(false);
                        if (theme.logo.url) {
                            Theme.setLogoUrl(theme.logo.url);
                        } else switch (theme.logo.preset) {
                            case "schoology_plus":
                                Theme.setLogoUrl(chrome.runtime.getURL("/imgs/schoology-plus-wide.svg"));
                                break;
                            case "schoology_logo":
                                Theme.setLogoUrl();
                                break;
                            case "lausd_legacy":
                                Theme.setLogoUrl(chrome.runtime.getURL("/imgs/lausd-legacy.png"));
                                break;
                            case "lausd_2019":
                                Theme.setLogoUrl(chrome.runtime.getURL("/imgs/lausd-2019.png"));
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
                            Theme.setBackgroundColor(theme.colors[0], theme.colors[1], theme.colors[2], theme.colors[3]);
                        }
                        Theme.setCursorUrl(theme.cursor);
                        theme.logo = theme.logo || "schoology";
                        switch (theme.logo) {
                            case "schoology":
                                Theme.setLogoUrl();
                                break;
                            case "lausd":
                                Theme.setLogoUrl(chrome.runtime.getURL("/imgs/lausd-legacy.png"));
                                break;
                            case "lausd_new":
                                Theme.setLogoUrl(chrome.runtime.getURL("/imgs/lausd-2019.png"));
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
                    let hue = 0;
                    let saturation = 0;
                    let lightness = 0;
                    let time = new Date().valueOf();

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
                        saturation = getComponentValue(theme.color.rainbow.saturation.animate, time);
                    } else {
                        saturation = theme.color.rainbow.saturation.value;
                    }
                    if (theme.color.rainbow.lightness.animate) {
                        lightness = getComponentValue(theme.color.rainbow.lightness.animate, time);
                    } else {
                        lightness = theme.color.rainbow.lightness.value;
                    }

                    Theme.setBackgroundHue(hue, saturation, lightness);
                }
            }
            return undefined;

            function getComponentValue(animateObject, time) {
                let { speed, offset, alternate, min, max } = animateObject;
                let range = max - min;
                let v = (((time / (150 - speed)) + +offset) % (alternate ? range * 2 : range)) + min;
                if (alternate && v > max) {
                    v = max - (v - max);
                }
                return v;
            }
        }

        if (!theme.name || (theme.hue && Number.isNaN(Number.parseFloat(theme.hue))) || (theme.colors && theme.colors.length != 4)) return null;
        return new Theme(
            theme.name,
            createOnApply(),
            createOnUpdate()
        );
    }

    static apply(theme) {
        Theme.setBackgroundHue(210);
        Theme.setCursorUrl();
        Theme.setDefaultLogoVisibility(false);
        Theme.setLogoUrl();
        theme.onapply();
        Theme.setProfilePictures();
    }

    static get active() {
        return tempTheme ? Theme.byName(tempTheme) : Theme.byName(Setting.getValue("theme")) || Theme.byName("Schoology Plus");
    }

    static byName(name) {
        return themes.find(x => x.name == name) || Theme.byName("Schoology Plus");
    }

    static setBackgroundColor(primaryColor, backgroundColor, hoverColor, borderColor) {
        if (primaryColor && backgroundColor && hoverColor && borderColor) {
            document.documentElement.style.setProperty("--primary-color", primaryColor);
            document.documentElement.style.setProperty("--background-color", backgroundColor);
            document.documentElement.style.setProperty("--hover-color", hoverColor);
            document.documentElement.style.setProperty("--border-color", borderColor);
        }
    }

    static setBackgroundHue(hue, saturation = undefined, lightness = undefined) {
        if (hue && !saturation && !lightness) {
            document.documentElement.style.setProperty("--color-hue", hue);
            document.documentElement.style.setProperty("--primary-color", "hsl(var(--color-hue), 50%, 50%)");
            document.documentElement.style.setProperty("--background-color", "hsl(var(--color-hue), 60%, 30%)");
            document.documentElement.style.setProperty("--hover-color", "hsl(var(--color-hue), 55%, 40%)");
            document.documentElement.style.setProperty("--border-color", "hsl(var(--color-hue), 60%, 25%)");
        } else if (hue) {
            document.documentElement.style.setProperty("--color-hue", hue);
            document.documentElement.style.setProperty("--primary-color", `hsl(var(--color-hue), ${saturation}%, ${lightness}%)`);
            document.documentElement.style.setProperty("--background-color", "hsl(var(--color-hue), 60%, 30%)");
            document.documentElement.style.setProperty("--hover-color", "hsl(var(--color-hue), 55%, 40%)");
            document.documentElement.style.setProperty("--border-color", "hsl(var(--color-hue), 60%, 25%)");
        }
    }

    static setProfilePictures(candidateImages) {
        if (Setting.getValue("courseIcons") === "disabled") return;
        // whether or not to skip setting themed icons where the teacher has already set one
        let skipOverriddenIcons = Setting.getValue("courseIcons") === "defaultOnly";
        let pictures = [];
        if (candidateImages) {
            if (!skipOverriddenIcons) {
                pictures = Array.from(candidateImages);
            } else {
                pictures = Array.from(candidateImages).filter(x => x.src.match(defaultCourseIconUrlRegex));
            }
        }
        //Course profile picture on course page
        let bigCourseIcon = document.querySelector(".profile-picture-wrapper.sCourse-processed .profile-picture>img");
        if (skipOverriddenIcons && bigCourseIcon && !bigCourseIcon.src.match(defaultCourseIconUrlRegex)) bigCourseIcon = null;
        if (bigCourseIcon) pictures.push(bigCourseIcon);
        //List of courses on user page
        //Note that the modal popup also uses this class
        let coursesList = document.querySelectorAll(".my-courses-item-list");
        if (coursesList && coursesList.length > 0) {
            let courseImgs = [];
            for (let c of Array.from(coursesList).reduce((accum, curr) => accum.concat(Array.from(curr.querySelectorAll(".course-item"))), [])) {
                let img = c.querySelector(".profile-picture>img");
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

        let arrows = Array.from(document.querySelectorAll(".gradebook-course-title .arrow, .splus-course-icon"));

        for (let arrow of arrows) {
            arrow.themedIconMode = "gradesPageArrow";
        }

        // courses drop down icons
        let coursesDropDownIcons = document.querySelectorAll(".splus-courses-navbar-button ._1tpub.Kluyr a.Card-card-1Qd8e .Card-card-image-uV6Bu");

        for (let cDropIcon of coursesDropDownIcons) {
            cDropIcon.themedIconMode = "coursesDropDown";
            let cDropLink = cDropIcon.parentElement;
            // course + section titles
            let courseTitle = cDropLink.querySelector(".Card-card-data-17m6S div:not(.splus-coursesdropdown-nicknamed-dataset) ._3U8Br._2s0LQ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB");
            if (!courseTitle) {
                continue;
            }
            courseTitle = courseTitle.textContent;
            let sectionTitle = cDropLink.querySelector(".Card-card-data-17m6S div:not(.splus-coursesdropdown-nicknamed-dataset) ._1wP6w._23_WZ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB");
            if (!sectionTitle) {
                continue;
            }
            sectionTitle = sectionTitle.textContent;
            cDropIcon.courseTitle = courseTitle + ": " + sectionTitle;

            let existingUrl = cDropIcon.style.backgroundImage.slice(4, -1).replace(/"/g, "");
            if (!skipOverriddenIcons || existingUrl.match(defaultCourseIconUrlRegex)) {
                arrows.push(cDropIcon);
            }
        }

        let missingIconsLastCheck = Setting.getValue("missingIconsLastCheck");
        let coursesMissingDefaultIcons = new Set();

        for (let arrow of arrows) {
            arrow.classList.add("icon-modified");
            // fallbacks don't work in CSS
            // implement our own thing for it, based on img and onerror
            let sourceUrl = Theme.getIcon(arrow.dataset.courseTitle || arrow.courseTitle || arrow.parentElement.textContent);
            let fallbackUrl = chrome.runtime.getURL("imgs/fallback-course-icon.svg");
            let matches = sourceUrl && sourceUrl.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            let domain = matches && matches[1];

            if (!domain) {
                sourceUrl = fallbackUrl;
            } else {
                let containerImg;
                for (let imgTester of themeIconLoadElementContainer.children) {
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
                            containerImg.dataset.result = "fail";
                            containerImg.onerror = null;
                        }

                        // in case this gets called before we get through the rest of this method, somehow
                        sourceUrl = fallbackUrl;

                        if (arrow.themedIconMode == "gradesPageArrow") {
                            arrow.setAttribute("style", `background: url(${fallbackUrl}) no-repeat 0; background-size: cover;`);
                        } else if (arrow.themedIconMode == "coursesDropDown") {
                            arrow.setAttribute("style", `background-image: url(${fallbackUrl}); background-size: contain;`);
                        }
                    }

                    if (!containerImg.src) {
                        // not yet attempted
                        containerImg.onload = function () {
                            containerImg.onload = null;
                            containerImg.dataset.result = "success";
                        };

                        containerImg.src = sourceUrl;
                    }
                }
            }

            if (arrow.themedIconMode == "gradesPageArrow") {
                arrow.setAttribute("style", `background: url(${sourceUrl}) no-repeat 0; background-size: cover;`);
            } else if (arrow.themedIconMode == "coursesDropDown") {
                arrow.setAttribute("style", `background-image: url(${sourceUrl}); background-size: contain;`);
            }

            // ***** Tracking courses missing icons
            if ((!missingIconsLastCheck || beforeThisSemester(missingIconsLastCheck)) && !Theme.hasBuiltInIcon(arrow.dataset.courseTitle || arrow.courseTitle || arrow.parentElement.textContent)) {
                coursesMissingDefaultIcons.add(arrow.dataset.courseTitle || arrow.courseTitle || arrow.parentElement.textContent);
            }
            // *****
        }

        for (let img of pictures) {
            img.onerror = function () {
                // avoid infinite recursion
                img.onerror = null;
                img.src = chrome.runtime.getURL("imgs/fallback-course-icon.svg");
                img.classList.add("splus-loaderror");
            };
            img.src = Theme.getIcon(img.alt);
            img.classList.add("injected-course-icon");
        }

        if (isLAUSD() && !shownMissingIconsNotification && coursesMissingDefaultIcons.size > 0 && showToast) {
            let coursesString = encodeURI(Array.from(coursesMissingDefaultIcons).join("\n").replace("&", "{amp;}"));
            showToast("Request New Course Icons?",
                `${coursesMissingDefaultIcons.size} ${coursesMissingDefaultIcons.size == 1 ? "course is missing a Schoology Plus course icon. Would you like to request that an icon be added for this course?" : "courses are missing Schoology Plus course icons. Would you like to request that icons be added for these courses?"}`,
                "yellow",
                {
                    buttons: [
                        createToastButton("Yes", "suggest-icons-button", () => window.open(`${ICON_REQUEST_URL}${coursesString}`, "_blank")),
                        createToastButton("No", "nothing-button", () => showToast("You can request icons later from course options", "", "hsl(190, 100%, 50%)", { timeout: 5000 })),
                    ]
                }
            );
            shownMissingIconsNotification = true;
            Setting.setValue("missingIconsLastCheck", new Date().valueOf());
        }
    }

    static setDefaultLogoVisibility(visible) {
        // False: show Schoology/custom logo; True: show LAUSD logo
        if (visible) {
            document.documentElement.classList.remove("use-custom-url");
        } else {
            document.documentElement.classList.add("use-custom-url");
        }
    }

    static setLogoUrl(url = "https://ui.schoology.com/design-system/assets/schoology-logo-horizontal-white.884fbe559c66e06d28c5cfcbd4044f0e.svg") {
        setCSSVariable("background-url", `url(${url})`);
    }

    static setCursorUrl(url) {
        document.documentElement.style.setProperty("--cursor", url ? `url(${url}), auto` : "auto");
    }
}

Theme.profilePictureOverrides = [];

let tempTheme = undefined;

let themes = [];
for (let t of __defaultThemes) {
    themes.push(Theme.loadFromObject(t));
}

setInterval(() => {
    if (Theme.active.onupdate) {
        Theme.active.onupdate();
    }
}, 100);


/**
 * Returns true if the date specified is in a semester prior to the current semester
 * @param {Date|number} oldDate The date to check
 */
function beforeThisSemester(oldDate) {
    let curr = getSemester(new Date());
    let prev = getSemester(new Date(oldDate));
    if (prev.year < curr.year || prev.year === curr.year && prev.semester !== curr.semester && prev.semester === "Spring") {
        return true;
    }
    return false;

    function getSemester(date) {
        let m = date.getMonth();
        let y = date.getFullYear();
        return { semester: m > 0 && m < 8 ? "Spring" : "Fall", year: m == 0 ? y - 1 : y };
    }
}