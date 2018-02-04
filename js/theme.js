class Theme {
    constructor(name, onApply, onUpdate) {
        this.name = name;
        this.onapply = onApply;
        this.onupdate = onUpdate;
    }

    static getIcon(course) {
        if (storage.themes) {
            let t = storage.themes.find(x => x.name === Theme.active.name);
            if (t && t.icons) {
                for (let pattern in t.icons) {
                    if (course.match(new RegExp(pattern))) {
                        return t.icons[pattern];
                    }
                }
            }
        }

        for (let pattern in icons) {
            if (course.match(new RegExp(pattern))) {
                return icons[pattern];
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
        theme.onapply(storage);
        Theme.setProfilePictures();
    }

    static get active() {
        return tempTheme ? Theme.byName(tempTheme) : Theme.byName(storage["theme"]) || Theme.byName("Custom Color");
    }

    static byName(name) {
        return themes.find(x => x.name == name) || Theme.byName("Custom Color");
    }

    static setBackgroundColor(primaryColor, primaryLight, primaryDark, primaryVeryDark) {
        if (primaryColor && primaryLight && primaryDark && primaryVeryDark) {
            document.documentElement.style.setProperty("--primary-color", primaryColor);
            document.documentElement.style.setProperty("--primary-light", primaryLight);
            document.documentElement.style.setProperty("--primary-dark", primaryDark);
            document.documentElement.style.setProperty("--primary-very-dark", primaryVeryDark);
        }
    }

    static setBackgroundHue(hue) {
        if (hue) {
            document.documentElement.style.setProperty("--color-hue", hue);
            document.documentElement.style.setProperty("--primary-color", "hsl(var(--color-hue), 50%, 50%)");
            document.documentElement.style.setProperty("--primary-light", "hsl(var(--color-hue), 60%, 55%)");
            document.documentElement.style.setProperty("--primary-dark", "hsl(var(--color-hue), 55%, 40%)");
            document.documentElement.style.setProperty("--primary-very-dark", "hsl(var(--color-hue), 90%, 50%)");
        }
    }

    static setProfilePictures() {
        if(storage["courseIcons"] === "disabled") return;
        let pictures = [];
        //Courses drop down
        pictures = Array.from(document.querySelectorAll(".section-item .profile-picture>img"));
        //Course profile picture on course page
        let bigCourseIcon = document.querySelector(".sCourse-processed .profile-picture>img");
        if (bigCourseIcon) pictures.push(bigCourseIcon);
        //List of courses on user page
        let coursesList = document.querySelector(".my-courses-item-list");
        if (coursesList) {
            let courseImgs = [];
            for (let c of Array.from(coursesList.querySelectorAll(".course-item"))) {
                let img = c.querySelector(".profile-picture>img");
                img.alt = "Profile picture for " + c.textContent;
                courseImgs.push(img);
            }
            pictures = pictures.concat(courseImgs);
        }

        for (let img of pictures) {
            img.src = Theme.getIcon(img.alt);
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
        "Custom Color",
        function (storage) {
            Theme.setBackgroundHue(storage["color"] || 210);
        }
    ),
    new Theme(
        "Rainbow",
        function (storage) {
            Theme.setBackgroundHue((new Date().valueOf() / 100) % 360);
        },
        function (storage) {
            Theme.setBackgroundHue((new Date().valueOf() / 100) % 360);
        }
    ),
    new Theme(
        "Toy",
        function (storage) {
            Theme.setBackgroundHue(150);
            Theme.setCursorUrl(chrome.runtime.getURL("imgs/toy-mode.png"));
        }
    ),
    new Theme(
        "LAUSD Orange",
        function (storage) {
            Theme.setBackgroundColor("#FF7A00", "#FF8A10", "#FF9A20", "#DF5A00");
            Theme.setLogoVisibility(true);
        }
    )
];

setInterval(() => {
    if (storage) {
        if (Theme.active.onupdate) {
            Theme.active.onupdate(storage);
        }
    }
}, 100);