class Theme {
    constructor(name, onApply, onUpdate) {
        this.name = name;
        this.onapply = onApply;
        this.onupdate = onUpdate;
    }

    static get active() {
        return tempTheme ? Theme.byName(tempTheme) : Theme.byName(storage["theme"]) || Theme.byName("Custom");
    }

    static byName(name) {
        return themes.find(x => x.name == name);
    }

    static setBackgroundHue(hue) {
        document.documentElement.style.setProperty("--color-hue", hue);
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
    )
];

setInterval(() => {
    if (storage) {
        if (Theme.active.onupdate) {
            Theme.active.onupdate(storage);
        }
    }
}, 100);