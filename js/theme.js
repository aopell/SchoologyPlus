class Theme {
    constructor(name, onApply, onUpdate) {
        this.name = name;
        this.onapply = onApply;
        this.onupdate = onUpdate;
    }

    static apply(theme) {
        Theme.setBackgroundHue(210);
        Theme.setCursorUrl();
        Theme.setLogoVisibility(false);
        theme.onapply(storage);
    }

    static get active() {
        return tempTheme ? Theme.byName(tempTheme) : Theme.byName(storage["theme"]) || Theme.byName("Custom");
    }

    static byName(name) {
        return themes.find(x => x.name == name);
    }

    static setBackgroundColor(primaryColor, primaryLight, primaryDark, primaryVeryDark) {
        document.documentElement.style.setProperty("--primary-color", primaryColor);
        document.documentElement.style.setProperty("--primary-light", primaryLight);
        document.documentElement.style.setProperty("--primary-dark", primaryDark);
        document.documentElement.style.setProperty("--primary-very-dark", primaryVeryDark);
    }

    static setBackgroundHue(hue) {
        document.documentElement.style.setProperty("--color-hue", hue);
        document.documentElement.style.setProperty("--primary-color", "hsl(var(--color-hue), 50%, 50%)");
        document.documentElement.style.setProperty("--primary-light", "hsl(var(--color-hue), 70%, 60%)");
        document.documentElement.style.setProperty("--primary-dark", "hsl(var(--color-hue), 55%, 40%)");
        document.documentElement.style.setProperty("--primary-very-dark", "hsl(var(--color-hue), 90%, 50%)");
    }

    static setLogoVisibility(visible) {
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

    static setCursorUrl(url) {
        document.documentElement.style.setProperty("--cursor", url ? `url(${url}), auto` : "auto");
    }
}

let tempTheme = undefined;

let themes = [
    new Theme(
        "Custom",
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