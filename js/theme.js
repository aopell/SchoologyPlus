// an img per domain
// to check if images load
let themeIconLoadElementContainer = document.createElement("div");
themeIconLoadElementContainer.style.display = "none";

class Theme {
    constructor(name, onApply, onUpdate) {
        this.name = name;
        this.onapply = onApply;
        this.onupdate = onUpdate;
    }

    static getIcon(course) {
        if (Setting.getValue("themes")) {
            let t = Setting.getValue("themes").find(x => x.name === Theme.active.name);
            if (t && t.icons && t.icons instanceof Array) {
                for (let iconPattern of t.icons) {
                    if (course.match(new RegExp(iconPattern[0], 'i'))) {
                        return iconPattern[1];
                    }
                }
            }
        }

        for (let iconPattern of icons) {
            if (course.match(new RegExp(iconPattern[0], 'i'))) {
                return iconPattern[1];
            }
        }
    }

    static loadFromObject(obj) {
        if (!obj.name || (obj.hue && Number.isNaN(Number.parseFloat(obj.hue))) || (obj.colors && obj.colors.length != 4)) return null;
        return new Theme(
            obj.name,
            () => {
                Theme.setBackgroundHue(obj.hue);
                if (obj.colors) {
                    Theme.setBackgroundColor(obj.colors[0], obj.colors[1], obj.colors[2], obj.colors[3]);
                }
                Theme.setLogoVisibility(obj.logo && obj.logo.toLowerCase() != "schoology");
                Theme.setCursorUrl(obj.cursor);
                if (obj.logo && obj.logo.toLowerCase() != "schoology" && obj.logo.toLowerCase() != "lausd") {
                    Theme.setLogoUrl(obj.logo);
                }
            }
        );
    }

    static apply(theme) {
        Theme.setBackgroundHue(210);
        Theme.setCursorUrl();
        Theme.setLogoVisibility(false);
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

    static setBackgroundColor(primaryColor, primaryLight, primaryDark, primaryVeryDark) {
        if (primaryColor && primaryLight && primaryDark && primaryVeryDark) {
            document.documentElement.style.setProperty("--primary-color", primaryColor);
            document.documentElement.style.setProperty("--background-color", primaryLight);
            document.documentElement.style.setProperty("--hover-color", primaryDark);
            document.documentElement.style.setProperty("--border-color", primaryVeryDark);
        }
    }

    static setBackgroundHue(hue) {
        if (hue) {
            document.documentElement.style.setProperty("--color-hue", hue);
            document.documentElement.style.setProperty("--primary-color", "hsl(var(--color-hue), 50%, 50%)");
            document.documentElement.style.setProperty("--background-color", "hsl(var(--color-hue), 60%, 55%)");
            document.documentElement.style.setProperty("--hover-color", "hsl(var(--color-hue), 55%, 40%)");
            document.documentElement.style.setProperty("--border-color", "hsl(var(--color-hue), 90%, 50%)");
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
        //Courses drop down
        pictures = pictures.concat(Array.from(document.querySelectorAll(".section-item .profile-picture>img")));
        if (skipOverriddenIcons) {
            pictures = pictures.filter(p => p.src.match(defaultCourseIconUrlRegex));
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

        let arrows = document.querySelectorAll(".gradebook-course-title .arrow");

        for (let arrow of arrows) {
            arrow.classList.add("icon-modified");
            // fallbacks don't work in CSS
            // implement our own thing for it, based on img and onerror
            let sourceUrl = Theme.getIcon(arrow.parentElement.textContent);
            let fallbackUrl = chrome.runtime.getURL("imgs/fallback-course-icon.svg");
            let matches = sourceUrl.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
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
                        arrow.setAttribute("style", `background: url(${fallbackUrl}) no-repeat 0; background-size: cover;`);
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

            arrow.setAttribute("style", `background: url(${sourceUrl}) no-repeat 0; background-size: cover;`);
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
    }

    static setLogoVisibility(visible) {
        // Hacky workaround to ensure logo element has loaded
        let interval = setInterval(() => {
            let logo = document.querySelector("#home a");
            let notLogo = document.querySelector("#home a[role=menuitem]")
            if (!notLogo && logo) {
                clearInterval(interval);
                if (visible) {
                    logo.classList.remove("hide-background-image");
                } else {
                    logo.classList.add("hide-background-image");
                }
            }
        }, 50);
    }

    static setLogoUrl(url) {
        // Hacky workaround to ensure logo element has loaded
        let interval = setInterval(() => {
            let logo = document.querySelector("#home a");
            let notLogo = document.querySelector("#home a[role=menuitem]")
            if (!notLogo && logo) {
                clearInterval(interval);
                if (url) {
                    logo.classList.add("custom-background-image");
                    document.documentElement.style.setProperty("--background-url", `url(${url})`);
                }
                else {
                    logo.classList.remove("custom-background-image");
                }
            }
        }, 50);
    }

    static setCursorUrl(url) {
        document.documentElement.style.setProperty("--cursor", url ? `url(${url}), auto` : "auto");
    }
}

let tempTheme = undefined;

let themes = [
    new Theme(
        "Schoology Plus",
        function () {
            Theme.setBackgroundHue(Setting.getValue("color") || 210);
        }
    ),
    new Theme(
        "Rainbow",
        function () {
            Theme.setBackgroundHue((new Date().valueOf() / 100) % 360);
        },
        function () {
            Theme.setBackgroundHue((new Date().valueOf() / 100) % 360);
        }
    ),
    new Theme(
        "Toy",
        function () {
            Theme.setBackgroundHue(150);
            Theme.setCursorUrl(chrome.runtime.getURL("imgs/toy-mode.png"));
        }
    ),
    new Theme(
        "LAUSD Orange",
        function () {
            Theme.setBackgroundColor("#FF7A00", "#FF8A10", "#FF9A20", "#DF5A00");
            Theme.setLogoVisibility(true);
        }
    )
];

setInterval(() => {
    if (Theme.active.onupdate) {
        Theme.active.onupdate();
    }
}, 100);
