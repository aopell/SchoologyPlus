const schoologyLogoImageUrl = "https://ui.schoology.com/design-system/assets/schoology-logo-horizontal-white.884fbe559c66e06d28c5cfcbd4044f0e.svg";
const lausdLegacyImageUrl = chrome.runtime.getURL("/imgs/lausd-legacy.png");
const lausdNewImageUrl = "https://lms.lausd.net/system/files/imagecache/node_themes/sites/all/themes/schoology_theme/node_themes/424392825/Asset%202_5c15191c5dd7e.png";
const CURRENT_VERSION = 2;

var allThemes = {};
var defaultThemes = [];
var rainbowInterval = null;
var themeName = document.getElementById("theme-name");
var themeHue = document.getElementById("theme-hue");
var themePrimaryColor = document.getElementById("theme-primary-color");
var themeSecondaryColor = document.getElementById("theme-secondary-color");
var themeBackgroundColor = document.getElementById("theme-background-color");
var themeBorderColor = document.getElementById("theme-border-color");
var themeSchoologyLogo = document.getElementById("theme-schoology-logo");
var themeNewLAUSDLogo = document.getElementById("theme-new-lausd-logo");
var themeLAUSDLogo = document.getElementById("theme-lausd-logo");
var themeCustomLogo = document.getElementById("theme-custom-logo");
var themeLogo = document.getElementById("theme-logo");
var themeCursor = document.getElementById("theme-cursor");
var themeColorHue = document.getElementById("theme-color-hue");
var themeColorCustom = document.getElementById("theme-color-custom");
var themeColorRainbow = document.getElementById("theme-color-rainbow");
var themeColorCustomWrapper = document.getElementById("theme-color-custom-wrapper");
var themeColorRainbowWrapper = document.getElementById("theme-color-rainbow-wrapper");
var colorRainbowHueAnimate = document.getElementById("color-rainbow-hue-animate");
var colorRainbowSaturationAnimate = document.getElementById("color-rainbow-saturation-animate");
var colorRainbowLightnessAnimate = document.getElementById("color-rainbow-lightness-animate");
var colorRainbowHueAnimateWrapper = document.getElementById("color-rainbow-hue-animate-wrapper");
var colorRainbowSaturationAnimateWrapper = document.getElementById("color-rainbow-saturation-animate-wrapper");
var colorRainbowLightnessAnimateWrapper = document.getElementById("color-rainbow-lightness-animate-wrapper");
var colorRainbowHueSpeed = document.getElementById("color-rainbow-hue-speed");
var colorRainbowHueValue = document.getElementById("color-rainbow-hue-value");
var colorRainbowSaturationSpeed = document.getElementById("color-rainbow-saturation-speed");
var colorRainbowSaturationValue = document.getElementById("color-rainbow-saturation-value");
var colorRainbowLightnessSpeed = document.getElementById("color-rainbow-lightness-speed");
var colorRainbowLightnessValue = document.getElementById("color-rainbow-lightness-value");
var colorRainbowHueAlternate = document.getElementById("color-rainbow-hue-alternate");
var colorRainbowSaturationAlternate = document.getElementById("color-rainbow-saturation-alternate");
var colorRainbowLightnessAlternate = document.getElementById("color-rainbow-lightness-alternate");
var colorRainbowHueRange = document.getElementById("color-rainbow-hue-range");
var colorRainbowSaturationRange = document.getElementById("color-rainbow-saturation-range");
var colorRainbowLightnessRange = document.getElementById("color-rainbow-lightness-range");
var themeHueWrapper = document.getElementById("theme-hue-wrapper");
var themeLogoWrapper = document.getElementById("theme-logo-wrapper");
var previewSection = document.getElementById("preview-section");
var lockIcon = document.getElementById("lock-icon");
var themesList = document.getElementById("themes-list");
var themesListSection = document.getElementById("themes-list-section");
var themeEditorSection = document.getElementById("theme-editor-section");
var testIcon = document.getElementById("test-icon");
var iconList = document.getElementById("icon-list");
var tabIcons = document.getElementById("tab-icons");
/** @type {HTMLTableElement} */
var iconListTable = document.getElementById("icon-list-table");
var newIcon = document.getElementById("new-icon");
newIcon.addEventListener("click", addIcon);
var iconTestText = document.getElementById("icon-test-text");
iconTestText.addEventListener("input", iconPreview);
var saveButton = document.getElementById("save-button");
saveButton.addEventListener("click", e => saveTheme());
var saveCloseButton = document.getElementById("save-close-button");
saveCloseButton.addEventListener("click", e => saveTheme(true));
var discardButton = document.getElementById("discard-button");
discardButton.addEventListener("click", e => confirm("Are you sure you want to discard changes?") && location.reload());
var closeButton = document.getElementById("close-button");
closeButton.addEventListener("click", e => (!inEditMode() || confirm('Are you sure you want to close without saving?')) && (location.href = 'https://lms.lausd.net'));
var createButton = document.getElementById("create-button");
createButton.addEventListener("click", e => editTheme());
var lockButton = document.getElementById("lock-button");
lockButton.addEventListener("click", e => {
    if (previewSection.classList.contains("fixed-on-large-and-up")) {
        previewSection.classList.remove("fixed-on-large-and-up");
        lockButton.classList.remove("locked");
        lockButton.classList.add("btn");
        lockButton.classList.remove("btn-flat");
        lockIcon.textContent = "lock_open";
    } else {
        previewSection.classList.add("fixed-on-large-and-up");
        lockButton.classList.add("locked");
        lockButton.classList.add("btn-flat");
        lockButton.classList.remove("btn");
        lockIcon.textContent = "lock";
    }
});

// document.querySelector(".move-down").addEventListener("click", moveDown);
// document.querySelector(".move-up").addEventListener("click", moveUp);
// document.querySelector(".delete-icon-button").addEventListener("click", deleteIcon);

var previewNavbar = document.getElementById("preview-navbar");
var previewLogo = document.getElementById("preview-logo");

var origThemeName;
let warnings = [];
let errors = [];
let theme = {};

var output = document.getElementById("json-output");
output.addEventListener("input", importThemeFromOutput);
output.addEventListener("paste", e => {
    if (inEditMode()) {
        e.preventDefault();
        e.stopPropagation();
        let t = e.clipboardData.getData("text");
        output.value = t;
        importThemeFromOutput();
    }
});

for (let e of document.querySelectorAll("#theme-editor-section input")) {
    e.addEventListener("input", function (event) {
        updateOutput();
    });
}
var mTabs = M.Tabs.init(document.querySelector(".tabs"));

function generateErrors(j) {
    let w = [];
    switch (j.version) {
        case 2:
            if (!j.name) w.push("Theme must have a name");
            break;
        default:
            if (!j.name) w.push("Theme must have a name")
            if (j.hue && Number.isNaN(Number.parseFloat(j.hue))) w.push("Value of 'hue' must be a number");
            if (j.colors && j.colors.length != 4) w.push("There must be four colors in 'colors'");
            if (j.colors && j.colors.map(x => !!validateColor(x)).includes(false)) w.push("One or more values of 'colors' is not a valid color");
            break;
    }
    return w;
}

function importThemeFromOutput() {
    errors = [];
    warnings = [];
    j = parseJSONObject(output.value);
    importFromObject(j);
}

function migrateTheme(t) {
    switch (t.version) {
        case 2:
            break;
        default:
            t.version = 2;
            if (t.colors) {
                t.color = {
                    custom: {
                        primary: t.colors[0],
                        background: t.colors[1],
                        hover: t.colors[2],
                        border: t.colors[3]
                    }
                };
                delete t.colors;
                delete t.hue;
            } else if (t.hue) {
                t.color = {
                    hue: t.hue
                };
                delete t.hue;
            }
            if (t.logo) {
                switch (t.logo) {
                    case "schoology":
                        t.logo = { preset: "schoology_logo" };
                        break;
                    case "lausd":
                        t.logo = { preset: "lausd_legacy" };
                        break;
                    case "lausd_new":
                        t.logo = { preset: "lausd_2019" };
                        break;
                    default:
                        t.logo = { url: t.logo };
                        break;
                }
            }
            if (t.cursor) {
                t.cursor = { primary: t.cursor };
            }
            if (t.icons) {
                let newIconsArray = [];
                for (let icon of t.icons) {
                    newIconsArray.push({
                        regex: icon[0],
                        url: icon[1]
                    });
                }
                t.icons = newIconsArray;
            }
            break;
    }
    return t.version == CURRENT_VERSION ? t : migrateTheme(t);
}

/**
 * Fills out form elements with the data contained in the provided Theme object
 * @param {{name:string,hue?:Number,colors?:string[],logo?:string,cursor?:string,icons?:Array}} j A SchoologyPlus theme object
 */
function importFromObject(j) {
    if (!j) {
        errors.push("The JSON you have entered is not valid");
        updatePreview(false);
        return;
    }

    errors = generateErrors(j);
    if (errors.length > 0) {
        updatePreview(false);
        return;
    }

    j = migrateTheme(j);

    themeName.value = j.name;

    themeLogo.value = "";
    j.logo = j.logo || { preset: "schoology_logo" };
    if (j.logo.preset) {
        if (j.logo.preset == "schoology_logo") themeSchoologyLogo.click();
        else if (j.logo.preset == "lausd_legacy") themeLAUSDLogo.click();
        else if (j.logo.preset == "lausd_2019") themeNewLAUSDLogo.click();
    } else {
        themeLogo.value = j.logo.url;
        themeCustomLogo.click();
    }

    $(themeHue).slider("value", j.color.hue === 0 ? 0 : (j.color.hue || 210));

    colorRainbowHueAnimate.checked = false;
    colorRainbowHueSpeed.value = 50;
    $(colorRainbowHueRange).roundSlider("setValue", "0,359");
    colorRainbowHueAlternate.checked = false;
    colorRainbowHueValue.value = 180;

    colorRainbowSaturationAnimate.checked = false;
    colorRainbowSaturationSpeed.value = 50;
    $(colorRainbowSaturationRange).slider("values", [0, 100]);
    colorRainbowSaturationAlternate.checked = false;
    colorRainbowSaturationValue.value = 50;

    colorRainbowLightnessAnimate.checked = false;
    colorRainbowLightnessSpeed.value = 50;
    $(colorRainbowLightnessRange).slider("values", [0, 100]);
    colorRainbowLightnessAlternate.checked = false;
    colorRainbowLightnessValue.value = 50;

    if (j.color.hue || j.color.hue === 0) {
        themeColorHue.click();
    } else if (j.color.custom) {
        let map = {
            "#theme-primary-color": "primary",
            "#theme-background-color": "background",
            "#theme-secondary-color": "hover",
            "#theme-border-color": "border"
        };
        Object.keys(map).map(x => $(x).spectrum("set", j.color.custom[map[x]]));
        themeColorCustom.click();
    } else if (j.color.rainbow) {
        themeColorRainbow.click();

        if (!!j.color.rainbow.hue.animate !== colorRainbowHueAnimate.checked) {
            colorRainbowHueAnimate.click();
        }

        if (j.color.rainbow.hue.animate) {
            colorRainbowHueSpeed.value = j.color.rainbow.hue.animate.speed;
            colorRainbowHueValue.value = j.color.rainbow.hue.animate.offset;
            if (!!j.color.rainbow.hue.animate.alternate !== colorRainbowHueAlternate.checked) {
                colorRainbowHueAlternate.click();
            }
            let l = j.color.rainbow.hue.animate.min || 0
                && j.color.rainbow.hue.animate.min >= 0
                && j.color.rainbow.hue.animate.min <= 359
                ? j.color.rainbow.hue.animate.min
                : 0;
            let u = j.color.rainbow.hue.animate.max
                && j.color.rainbow.hue.animate.max >= 0
                && j.color.rainbow.hue.animate.max <= 359
                ? j.color.rainbow.hue.animate.max
                : 359;
            $(colorRainbowHueRange).roundSlider("setValue", `${l},${u}`);
        } else {
            colorRainbowHueValue.value = j.color.rainbow.hue.value;
        }

        if (!!j.color.rainbow.saturation.animate !== colorRainbowSaturationAnimate.checked) {
            colorRainbowSaturationAnimate.click();
        }

        if (j.color.rainbow.saturation.animate) {
            colorRainbowSaturationSpeed.value = j.color.rainbow.saturation.animate.speed;
            colorRainbowSaturationValue.value = j.color.rainbow.saturation.animate.offset;
            if (!!j.color.rainbow.saturation.animate.alternate !== colorRainbowSaturationAlternate.checked) {
                colorRainbowSaturationAlternate.click();
            }
            $(colorRainbowSaturationRange).slider("values", [
                j.color.rainbow.saturation.animate.min
                    && j.color.rainbow.saturation.animate.min < j.color.rainbow.saturation.animate.max
                    && j.color.rainbow.saturation.animate.min >= 0
                    && j.color.rainbow.saturation.animate.min <= 100
                    ? j.color.rainbow.saturation.animate.min
                    : 0,
                j.color.rainbow.saturation.animate.max
                    && j.color.rainbow.saturation.animate.max > j.color.rainbow.saturation.animate.min
                    && j.color.rainbow.saturation.animate.max >= 0
                    && j.color.rainbow.saturation.animate.max <= 100
                    ? j.color.rainbow.saturation.animate.max
                    : 100
            ]);
        } else {
            colorRainbowSaturationValue.value = j.color.rainbow.saturation.value;
        }

        if (!!j.color.rainbow.lightness.animate !== colorRainbowLightnessAnimate.checked) {
            colorRainbowLightnessAnimate.click();
        }

        if (j.color.rainbow.lightness.animate) {
            colorRainbowLightnessSpeed.value = j.color.rainbow.lightness.animate.speed;
            colorRainbowLightnessValue.value = j.color.rainbow.lightness.animate.offset;
            if (!!j.color.rainbow.lightness.animate.alternate !== colorRainbowLightnessAlternate.checked) {
                colorRainbowLightnessAlternate.click();
            }
            $(colorRainbowLightnessRange).slider("values", [
                j.color.rainbow.lightness.animate.min
                    && j.color.rainbow.lightness.animate.min < j.color.rainbow.lightness.animate.max
                    && j.color.rainbow.lightness.animate.min >= 0
                    && j.color.rainbow.lightness.animate.min <= 100
                    ? j.color.rainbow.lightness.animate.min
                    : 0,
                j.color.rainbow.lightness.animate.max
                    && j.color.rainbow.lightness.animate.max > j.color.rainbow.lightness.animate.min
                    && j.color.rainbow.lightness.animate.max >= 0
                    && j.color.rainbow.lightness.animate.max <= 100
                    ? j.color.rainbow.lightness.animate.max
                    : 100
            ]);
        } else {
            colorRainbowLightnessValue.value = j.color.rainbow.lightness.value;
        }
    }

    for (let el of themeColorRainbowWrapper.querySelectorAll("input[type=range][data-label]")) {
        document.getElementById(el.dataset.label).textContent = el.value;
    }

    for (let el of [colorRainbowSaturationRange, colorRainbowLightnessRange]) {
        document.getElementById(el.id + "-display").textContent = `${$(el).slider("values")[0]} - ${$(el).slider("values")[1]}`;
    }

    iconList.innerHTML = "";
    if (j.icons) {
        for (let i of j.icons) {
            let row = addIcon();
            row.querySelector(".class-name").textContent = i.regex;
            row.querySelector(".icon-url").textContent = i.url;
            row.querySelector(".small-icon-preview").src = i.url;
        }
    }

    themeCursor.value = "";
    if (j.cursor && j.cursor.primary) {
        themeCursor.value = j.cursor.primary;
    }

    M.updateTextFields();
    updateOutput();
}

let init = 0;
/**
 * Creates a Spectrum.js color picker
 * @param {string} id Element ID of the input element 
 * @param {(tinycolor)=>void} onupdate Callback called when color is changed
 */
function initPicker(id, onupdate) {
    $(`#${id}`).spectrum({
        showInput: true,
        containerClassName: "full-spectrum",
        showInitial: true,
        showPalette: true,
        showSelectionPalette: true,
        maxPaletteSize: 10,
        preferredFormat: "hex",
        color: ["red", "blue", "yellow", "green"][init++],
        move: function (color) {
            onupdate(color);
        },
        hide: function (color) {
            onupdate(color);
        },

        palette: [
            ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)", /*"rgb(153, 153, 153)","rgb(183, 183, 183)",*/
                "rgb(204, 204, 204)", "rgb(217, 217, 217)", /*"rgb(239, 239, 239)", "rgb(243, 243, 243)",*/ "rgb(255, 255, 255)"],
            ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
                "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"],
            ["rgb(230, 184, 175)", "rgb(244, 204, 204)", "rgb(252, 229, 205)", "rgb(255, 242, 204)", "rgb(217, 234, 211)",
                "rgb(208, 224, 227)", "rgb(201, 218, 248)", "rgb(207, 226, 243)", "rgb(217, 210, 233)", "rgb(234, 209, 220)",
                "rgb(221, 126, 107)", "rgb(234, 153, 153)", "rgb(249, 203, 156)", "rgb(255, 229, 153)", "rgb(182, 215, 168)",
                "rgb(162, 196, 201)", "rgb(164, 194, 244)", "rgb(159, 197, 232)", "rgb(180, 167, 214)", "rgb(213, 166, 189)",
                "rgb(204, 65, 37)", "rgb(224, 102, 102)", "rgb(246, 178, 107)", "rgb(255, 217, 102)", "rgb(147, 196, 125)",
                "rgb(118, 165, 175)", "rgb(109, 158, 235)", "rgb(111, 168, 220)", "rgb(142, 124, 195)", "rgb(194, 123, 160)",
                "rgb(166, 28, 0)", "rgb(204, 0, 0)", "rgb(230, 145, 56)", "rgb(241, 194, 50)", "rgb(106, 168, 79)",
                "rgb(69, 129, 142)", "rgb(60, 120, 216)", "rgb(61, 133, 198)", "rgb(103, 78, 167)", "rgb(166, 77, 121)",
                /*"rgb(133, 32, 12)", "rgb(153, 0, 0)", "rgb(180, 95, 6)", "rgb(191, 144, 0)", "rgb(56, 118, 29)",
                "rgb(19, 79, 92)", "rgb(17, 85, 204)", "rgb(11, 83, 148)", "rgb(53, 28, 117)", "rgb(116, 27, 71)",*/
                "rgb(91, 15, 0)", "rgb(102, 0, 0)", "rgb(120, 63, 4)", "rgb(127, 96, 0)", "rgb(39, 78, 19)",
                "rgb(12, 52, 61)", "rgb(28, 69, 135)", "rgb(7, 55, 99)", "rgb(32, 18, 77)", "rgb(76, 17, 48)"]
        ]
    });
}

initPicker("theme-primary-color", updateOutput);
initPicker("theme-secondary-color", updateOutput);
initPicker("theme-background-color", updateOutput);
initPicker("theme-border-color", updateOutput);

function updateOutput() {
    clearInterval(rainbowInterval);
    warnings = [];
    errors = [];
    theme = {
        name: themeName.value || undefined,
        version: 2
    };

    // Name
    if (!theme.name) {
        errors.push("Theme must have a name");
    } else if (inEditMode() && theme.name != origThemeName && allThemes[theme.name]) {
        errors.push(`A theme with the name "${theme.name}" already exists. Delete that theme or choose a different name before saving.`);
    }

    // Color
    if (themeColorHue.checked) {
        themeColorCustomWrapper.classList.add("hidden");
        themeHueWrapper.classList.remove("hidden");
        themeColorRainbowWrapper.classList.add("hidden");
        theme.color = {
            hue: $(themeHue).slider("value")
        };

        setCSSVariable("color-hue", theme.color.hue == 0 ? 0 : (theme.color.hue || 210));
        setCSSVariable("primary-color", "hsl(var(--color-hue), 50%, 50%)");
        setCSSVariable("background-color", "hsl(var(--color-hue), 60%, 30%)");
        setCSSVariable("hover-color", "hsl(var(--color-hue), 55%, 40%)");
        setCSSVariable("border-color", "hsl(var(--color-hue), 60%, 25%)");
    } else if (themeColorCustom.checked) {
        themeColorCustomWrapper.classList.remove("hidden");
        themeHueWrapper.classList.add("hidden");
        themeColorRainbowWrapper.classList.add("hidden");
        theme.color = {
            custom: {
                primary: $("#theme-primary-color").spectrum("get").toHexString(),
                hover: $("#theme-secondary-color").spectrum("get").toHexString(),
                background: $("#theme-background-color").spectrum("get").toHexString(),
                border: $("#theme-border-color").spectrum("get").toHexString()
            }
        };
        setCSSVariable("primary-color", theme.color.custom.primary);
        setCSSVariable("background-color", theme.color.custom.background);
        setCSSVariable("hover-color", theme.color.custom.hover);
        setCSSVariable("border-color", theme.color.custom.border);
    } else if (themeColorRainbow.checked) {
        themeColorCustomWrapper.classList.add("hidden");
        themeHueWrapper.classList.add("hidden");
        themeColorRainbowWrapper.classList.remove("hidden");

        theme.color = {
            rainbow: {
                hue: {},
                saturation: {},
                lightness: {}
            }
        };

        if (colorRainbowHueAnimate.checked) {
            colorRainbowHueAnimateWrapper.classList.remove("hidden");
            document.querySelector("label[for=color-rainbow-hue-value]").firstElementChild.textContent = "Hue Offset";
            theme.color.rainbow.hue = {
                animate: {
                    speed: +colorRainbowHueSpeed.value,
                    offset: +colorRainbowHueValue.value,
                    min: +$(colorRainbowHueRange).roundSlider("getValue").split(',')[0],
                    max: +$(colorRainbowHueRange).roundSlider("getValue").split(',')[1],
                    alternate: colorRainbowHueAlternate.checked
                }
            }
        } else {
            colorRainbowHueAnimateWrapper.classList.add("hidden");
            document.querySelector("label[for=color-rainbow-hue-value]").firstElementChild.textContent = "Hue Value";
            theme.color.rainbow.hue = {
                value: colorRainbowHueValue.value
            }
        }

        if (colorRainbowSaturationAnimate.checked) {
            colorRainbowSaturationAnimateWrapper.classList.remove("hidden");
            document.querySelector("label[for=color-rainbow-saturation-value]").firstElementChild.textContent = "Saturation Offset";
            theme.color.rainbow.saturation = {
                animate: {
                    speed: +colorRainbowSaturationSpeed.value,
                    offset: +colorRainbowSaturationValue.value,
                    min: $(colorRainbowSaturationRange).slider("values")[0],
                    max: $(colorRainbowSaturationRange).slider("values")[1],
                    alternate: colorRainbowSaturationAlternate.checked
                }
            }
        } else {
            colorRainbowSaturationAnimateWrapper.classList.add("hidden");
            document.querySelector("label[for=color-rainbow-saturation-value]").firstElementChild.textContent = "Saturation Value";
            theme.color.rainbow.saturation = {
                value: colorRainbowSaturationValue.value
            }
        }

        if (colorRainbowLightnessAnimate.checked) {
            colorRainbowLightnessAnimateWrapper.classList.remove("hidden");
            document.querySelector("label[for=color-rainbow-lightness-value]").firstElementChild.textContent = "Lightness Offset";
            theme.color.rainbow.lightness = {
                animate: {
                    speed: +colorRainbowLightnessSpeed.value,
                    offset: +colorRainbowLightnessValue.value,
                    min: $(colorRainbowLightnessRange).slider("values")[0],
                    max: $(colorRainbowLightnessRange).slider("values")[1],
                    alternate: colorRainbowLightnessAlternate.checked
                }
            }
        } else {
            colorRainbowLightnessAnimateWrapper.classList.add("hidden");
            document.querySelector("label[for=color-rainbow-lightness-value]").firstElementChild.textContent = "Lightness Value";
            theme.color.rainbow.lightness = {
                value: colorRainbowLightnessValue.value
            }
        }

        let f = generateRainbowFunction(theme);
        if (f) {
            rainbowInterval = setInterval(f, 100);
        }
    }

    // Logo
    themeLogoWrapper.classList.add("hidden");
    if (themeSchoologyLogo.checked) {
        theme.logo = {
            preset: "schoology_logo"
        };
        setCSSVariable("background-url", `url(${schoologyLogoImageUrl})`);
    } else if (themeNewLAUSDLogo.checked) {
        theme.logo = {
            preset: "lausd_2019"
        };
        setCSSVariable("background-url", `url(${lausdNewImageUrl})`);
    } else if (themeLAUSDLogo.checked) {
        theme.logo = {
            preset: "lausd_legacy"
        };
        setCSSVariable("background-url", `url(${lausdLegacyImageUrl})`);
    } else if (themeCustomLogo.checked) {
        themeLogoWrapper.classList.remove("hidden");
        if (themeLogo.value) {
            theme.logo = {
                url: themeLogo.value
            };
            checkImage(themeLogo.value, x => {
                if (x.target.width != 160 || x.target.height < 36 || x.target.height > 60) {
                    warnings.push("Logo image is not between the recommended sizes of 160x36 and 160x60");
                }
                setCSSVariable("background-url", `url(${themeLogo.value})`);
            }, () => errors.push("Logo URL does not point to a valid image"));
        }
    }

    // Cursor
    if (themeCursor.value) {
        theme.cursor = {
            primary: themeCursor.value
        };
        checkImage(themeCursor.value, x => {
            if (x.target.width > 128 || x.target.height > 128) {
                errors.push("Cursor images must be smaller than 128x128 to appear");
            }
            setCSSVariable("cursor", `url(${themeCursor.value}), auto`);
        }, () => errors.push("Cursor URL does not point to a valid image"));
    } else {
        setCSSVariable("cursor", "auto");
    }

    // Icons
    if (iconListTable.rows.length > 1) {
        let customIcons = [];
        let first = true;
        for (let row of iconListTable.rows) {
            if (first || !row.cells[1].textContent || !row.cells[2].textContent) {
                first = false;
                continue;
            }
            let pattern = row.cells[1].textContent;
            let url = row.cells[2].textContent;
            checkImage(url, undefined, () => errors.push(url + " is not a valid image URL (Course Icons)"));
            try {
                RegExp(pattern);
            } catch {
                errors.push(pattern + " is not a valid regular expression (Course Icons)");
            }
            customIcons.push({
                regex: pattern,
                url
            });
        }
        theme.icons = customIcons;
    }

    updatePreview();
}

/**
 * Update the theme preview and optionally the theme JSON
 * @param {boolean} updateJSON Whether or not to replace the JSON output with form values
 */
function updatePreview(updateJSON = true) {
    if (updateJSON) output.value = JSON.stringify(theme, null, 4);
    let warningCard = document.getElementById("warning-card");
    if (warnings.length > 0) {
        warningCard.style.display = "block";
        document.getElementById("warning-content").innerHTML = warnings.join("<br/>");
    }
    else {
        warningCard.style.display = "none";
    }
    let errorCard = document.getElementById("error-card");
    if (errors.length > 0) {
        errorCard.style.display = "block";
        document.getElementById("error-content").innerHTML = errors.join("<br/>");
    }
    else {
        errorCard.style.display = "none";
    }
    M.updateTextFields();
    M.textareaAutoResize(output);
    iconPreview();
}

/**
 * Saves the theme currently displayed in the preview with the given name.
 * If the querystring parameter `theme` exists, it will rename the theme with that value
 * @param {boolean} [apply=false] If true, applies the theme and returns to https://lms.lausd.net
 */
function saveTheme(apply = false) {
    if (errors.length > 0) return alert("Please fix all errors before saving the theme");
    let t = JSON.parse(output.value);
    if (origThemeName && t.name != origThemeName) {
        if (!confirm(`Are you sure you want to rename "${origThemeName}" to "${t.name}"`)) {
            return;
        }
    }
    chrome.storage.sync.get({ themes: [] }, s => {
        let themes = s.themes.filter(x => x.name != (origThemeName || t.name));
        themes.push(t);
        chrome.storage.sync.set({ themes: themes }, () => {
            alert("Theme saved successfully");
            origThemeName = t.name;
            if (apply) chrome.storage.sync.set({ theme: t.name }, () => location.href = "https://lms.lausd.net");
            else location.reload();
        });
    });
}

/**
 * Returns a valid CSS color string if input is valid, else returns an empty string
 * @param {string} c A possibly valid CSS color string
 * @returns {string} A valid CSS color string or `""` if input was invalid
 */
function validateColor(c) {
    var ele = document.createElement("div");
    ele.style.color = c;
    return ele.style.color.split(/\s+/).join('').toLowerCase();
}

/**
 * Checks if a URL points to a valid image
 * @param {string} imageSrc An image URL
 * @param {(Event)} validCallback Callback if image is valid
 * @param {(ErrorEvent)} invalidCallback Callback if image is invalid
 */
function checkImage(imageSrc, validCallback, invalidCallback) {
    try {
        var img = new Image();
        img.onload = validCallback;
        img.onerror = invalidCallback;
        img.src = imageSrc;
    } catch {
        invalidCallback();
    }
}

/**
 * Sets the value of a CSS variable on the document
 * @param {string} name Variable name 
 * @param {string} val New variable value
 */
function setCSSVariable(name, val) {
    document.documentElement.style.setProperty(`--${name}`, val);
}

/**
 * Checks if a string is a valid JSON object
 * @param {string} str A JSON string
 * @returns {{}|boolean} The object if it is valid JSON, else false
 */
function parseJSONObject(str) {
    var isObject = (val) => val instanceof Object ? true : false;
    try {
        let o = JSON.parse(str);
        return isObject(o) ? o : false;
    } catch (e) {
        return false;
    }
}

/**
 * Creates a DOM element
 * @returns {HTMLElement} A DOM element
 * @param {string} tag - The HTML tag name of the type of DOM element to create
 * @param {string[]} classList - CSS classes to apply to the DOM element
 * @param {Object.<string,any>} properties - Properties to apply to the DOM element
 * @param {HTMLElement[]} children - Elements to append as children to the created element
 */
function createElement(tag, classList, properties, children) {
    let element = document.createElement(tag);
    if (classList) {
        for (let c of classList) {
            element.classList.add(c);
        }
    }
    if (properties) {
        for (let property in properties) {
            if (properties[property] instanceof Object && !(properties[property] instanceof Function)) {
                for (let subproperty in properties[property]) {
                    element[property][subproperty] = properties[property][subproperty];
                }
            } else {
                element[property] = properties[property];
            }
        }
    }
    if (children) {
        for (let child of children) {
            element.appendChild(child);
        }
    }
    return element;
}

/**
 * Applies the theme with the given name
 * @param {string} t The theme's name
 */
function applyTheme(t) {
    importFromObject(allThemes[t]);
}

/**
 * Deletes a theme with the given name from the Chrome Sync Storage
 * @param {string} name The theme's name
 */
function deleteTheme(name) {
    if (confirm(`Are you sure you want to delete the theme "${name}"?\nThe page will reload when the theme is deleted.`)) {
        chrome.storage.sync.get(["theme", "themes"], s => {
            chrome.storage.sync.set({ theme: s.theme == name ? null : s.theme, themes: s.themes.filter(x => x.name != name) }, () => window.location.reload());
        });
        return true;
    }
    return false;
}

/**
 * Opens the editor interface with the given theme selected, or 
 * none selected if name not provided
 * @param {string} [name] The theme to edit
 */
function editTheme(name) {
    clearInterval(rainbowInterval);
    themesListSection.classList.add("hidden");
    themeEditorSection.classList.remove("hidden");
    importFromObject(name ? allThemes[name] : { name: "My Theme", hue: 210 });
    previewSection.classList.add("show-editor-controls");
    output.removeAttribute("readonly");
    Array.from(iconList.querySelectorAll(".class-name, .icon-url")).map(x => x.setAttribute("contenteditable", "true"));
    origThemeName = name;
    document.querySelector("#json-output + label").textContent = "JSON (Paste to import a theme)";
}

/**
 * Cycles the color of the interface
 */
function generateRainbowFunction(theme) {
    if (theme.color.rainbow) {
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
                saturation = getComponentValue(theme.color.rainbow.saturaiton.animate, time);
            } else {
                saturation = theme.color.rainbow.saturation.value;
            }
            if (theme.color.rainbow.lightness.animate) {
                lightness = getComponentValue(theme.color.rainbow.lightness.animate, time);
            } else {
                lightness = theme.color.rainbow.lightness.value;
            }

            document.documentElement.style.setProperty("--color-hue", hue);
            setCSSVariable("primary-color", `hsl(var(--color-hue), ${saturation}%, ${lightness}%)`);
            setCSSVariable("background-color", "hsl(var(--color-hue), 60%, 30%)");
            setCSSVariable("hover-color", "hsl(var(--color-hue), 55%, 40%)");
            setCSSVariable("border-color", "hsl(var(--color-hue), 60%, 25%)");
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

function addIcon() {
    let template = `<td style=text-align:center><a class="action-button tooltipped arrow-button move-down"data-tooltip="Move Down"><i class=material-icons>arrow_downward</i> </a><a class="action-button tooltipped arrow-button move-up"data-tooltip="Move Up"><i class=material-icons>arrow_upward</i></a><td class=class-name data-text="Class Name Pattern"><td class=icon-url data-text="Icon URL or paste/drop image"><td><img class="small-icon-preview" height=32/></td><td><a class="action-button tooltipped btn-flat delete-icon-button right waves-effect waves-light"data-tooltip=Delete><i class=material-icons>delete</i></a>`;
    let tr = document.createElement("tr");
    tr.innerHTML = template;
    iconList.appendChild(tr);
    let preview = tr.querySelector(".small-icon-preview");
    tr.querySelector(".move-down").addEventListener("click", moveDown);
    tr.querySelector(".move-up").addEventListener("click", moveUp);
    tr.querySelector(".delete-icon-button").addEventListener("click", deleteIcon);

    // Replaces pasted images with data urls
    tr.querySelector(".icon-url").addEventListener("paste", uploadAndPaste);

    initializeDragAndDrop(tr.querySelector(".icon-url"), tr.querySelector(".small-icon-preview"), "textContent");

    // Replaces pasted HTML with plain text
    tr.querySelector(".class-name").addEventListener("paste", plainTextPaste);

    tr.querySelector(".icon-url").addEventListener("input", e => preview.src = e.target.textContent);
    Array.from(tr.querySelectorAll("td")).map(x => x.addEventListener("blur", e => e.target.scrollLeft = 0));
    M.Tooltip.init(tr.querySelectorAll('.tooltipped'), { outDuration: 0, inDuration: 300, enterDelay: 0, exitDelay: 10, transition: 10 });
    if (inEditMode()) {
        let arr = Array.from(tr.querySelectorAll(".class-name, .icon-url"));
        arr.map(x => x.setAttribute("contenteditable", "true"));
        arr.map(x => x.addEventListener("input", updateOutput));
    }
    return tr;
}

function uploadAndPaste(pasteEvent) {
    let items = (pasteEvent.clipboardData || pasteEvent.originalEvent.clipboardData).items;
    let blob = null;
    for (let i of items) {
        if (i.type.indexOf("image") === 0) {
            blob = i.getAsFile();
        }
    }
    if (blob !== null) {
        pasteEvent.preventDefault();
        pasteEvent.stopPropagation();
        var reader = new FileReader();
        reader.onload = function (e) {
            let text = e.target.result;
            pasteEvent.target.dataset.originalText = pasteEvent.target.dataset.text;
            pasteEvent.target.dataset.text = "Uploading..."
            let t = M.toast({ html: `Uploading image...`, displayLength: Number.MAX_SAFE_INTEGER });
            imgurUpload(text, result => {
                t.dismiss();
                let link = result.data.link;
                if (document.queryCommandSupported('insertText')) {
                    document.execCommand('insertText', false, link);
                } else {
                    document.execCommand('paste', false, link);
                }
                preview.src = link;
                pasteEvent.target.dataset.text = pasteEvent.target.dataset.originalText;
                pasteEvent.target.dataset.originalText = "";
                updateOutput();
            }, error => {
                t.dismiss();
                M.toast({ html: `Uploading image failed: ${error.message || error.toString()}` });
                pasteEvent.target.dataset.text = pasteEvent.target.dataset.originalText;
                pasteEvent.target.dataset.originalText = "";
            });
        };
        reader.readAsDataURL(blob);
    } else {
        plainTextPaste(pasteEvent);
    }
}

function plainTextPaste(e) {
    e.preventDefault();
    var text = '';
    if (e.clipboardData || e.originalEvent.clipboardData) {
        text = (e.originalEvent || e).clipboardData.getData('text/plain');
    } else if (window.clipboardData) {
        text = window.clipboardData.getData('Text');
    }
    if (document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, text);
    } else {
        document.execCommand('paste', false, text);
    }
}

function moveUp(e) {
    let target = e.target;
    while (target.tagName != "TR") target = target.parentElement;
    if (target.previousElementSibling) {
        target.parentNode.insertBefore(target, target.previousElementSibling);
    }
    updateOutput();
}

function moveDown(e) {
    let target = e.target;
    while (target.tagName != "TR") target = target.parentElement;
    if (target.nextElementSibling) {
        target.parentNode.insertBefore(target.nextElementSibling, target);
    }
    updateOutput();
}

function deleteIcon(e) {
    let target = e.target;
    while (target.tagName != "TR") target = target.parentElement;
    M.Tooltip.getInstance(target.querySelector(".delete-icon-button")).destroy();
    target.outerHTML = "";
    updateOutput();
}

function iconPreview(e) {
    testIcon.src = (s => {
        if (!s) {
            return "https://image.flaticon.com/icons/svg/164/164949.svg";
        }

        s += " ";

        if (theme && theme.icons) {
            for (let iconPattern of theme.icons) {
                if (s.match(new RegExp(iconPattern.regex, 'i'))) {
                    return iconPattern.url;
                }
            }
        }

        for (let iconPattern of icons) {
            if (s.match(new RegExp(iconPattern.regex, 'i'))) {
                return iconPattern.url;
            }
        }
    })(iconTestText.value);
}

function copyThemeToClipboard(themeName) {
    let text = JSON.stringify(allThemes[themeName]);
    var copyFrom = $('<textarea/>');
    copyFrom.text(text);
    $('body').append(copyFrom);
    copyFrom.select();
    document.execCommand('copy');
    copyFrom.remove();
    M.toast({ html: `Copied theme "${themeName}" to clipboard` });
}

function inEditMode() { return !!document.querySelector(".show-editor-controls"); }

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(region) {
    if (!region.classList.contains("highlight")) {
        region.classList.add("highlight");
        region.dataset.originalText = region.dataset.text;
        region.dataset.text = "Drop to Use Image"
    }
}

function unhighlight(region) {
    if (region.classList.contains("highlight")) {
        region.classList.remove("highlight");
        region.dataset.text = region.dataset.originalText;
        region.dataset.originalText = "";
    }
}

function handleDrop(e, region, preview, property) {
    try {
        if (e.dataTransfer.files.length > 0) {
            let file = e.dataTransfer.files[0];
            let reader = new FileReader();
            reader.onloadend = () => {
                region.dataset.originalText = region.dataset.text;
                region.dataset.text = "Uploading..."
                let t = M.toast({ html: `Uploading image...`, displayLength: Number.MAX_SAFE_INTEGER });

                imgurUpload(reader.result, result => {
                    success(result.data.link, t);
                }, error => {
                    t.dismiss();
                    M.toast({ html: `Uploading image failed: ${error.message || error.toString()}` });
                    region.dataset.text = region.dataset.originalText;
                    region.dataset.originalText = "";
                });
            };
            reader.readAsDataURL(file);
        } else if (e.dataTransfer.items.length >= 3) {
            e.dataTransfer.items[2].getAsString(s => {
                let img = htmlToElement(s);
                success(img.src);
            });
        }
    } catch (err) {
        M.toast({ html: `Error: Invalid image file` });
        console.error(err);
    }

    function success(link, toast) {
        if (toast) {
            toast.dismiss();
        }
        if (preview) {
            preview.src = link;
        }
        region[property] = link;
        region.dataset.text = region.dataset.originalText;
        region.dataset.originalText = "";
        updateOutput();
    }
}

function htmlToElement(html) {
    var template = document.createElement("template");
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
}

function imgurUpload(base64, callback, errorCallback) {
    if (!localStorage.getItem("imgurPromptViewed")) {
        if (!confirm("By clicking OK, you consent to have the image you just dropped or pasted uploaded to Imgur. Click cancel to prevent the upload. If you click OK, this message will not be shown again.")) {
            errorCallback(new Error("User did not give consent to upload"));
            return;
        } else {
            localStorage.setItem("imgurPromptViewed", true);
        }
    }

    const CLIENT_ID = "56755c36eb5772d";
    fetch("https://api.imgur.com/3/image", {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Client-ID ${CLIENT_ID}`
        },
        body: JSON.stringify({
            type: "base64",
            image: base64.split(',')[1]
        })
    }).then(response => {
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response;
    }).then(x => x.json()).then(callback).catch(err => console.log(err) || errorCallback(err));
}

function initializeDragAndDrop(region, preview, property) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        region.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        region.addEventListener(eventName, e => highlight(region), false);
    });
    region.addEventListener("dragleave", e => unhighlight(region), false);
    region.addEventListener('drop', e => {
        unhighlight(region);
        handleDrop(e, region, preview, property);
    }, false);
}

function hueSliderEvent(event, ui) {
    if (event.originalEvent) {
        updateOutput();
        document.getElementById("color-hue-value").textContent = ui.value.toString();
    }
}

function rangeSliderEvent(event, ui) {
    if (event.originalEvent) {
        document.getElementById(event.target.id + "-display").textContent = `${ui.values[0]} - ${ui.values[1]}`;
        updateOutput();
    }
}

function circleRangeSliderEvent(args) {
    updateOutput();
}

$(document).ready(function () {
    $.fn.roundSlider.prototype._invertRange = true;

    $("#theme-hue").slider({
        min: 0,
        max: 359,
        slide: hueSliderEvent,
        stop: hueSliderEvent,
        change: hueSliderEvent
    });

    $("#color-rainbow-hue-range").roundSlider({
        sliderType: "range",
        handleShape: "round",
        width: 15,
        radius: 75,
        value: "0,359",
        max: 359,
        startAngle: 90,
        drag: circleRangeSliderEvent,
        stop: circleRangeSliderEvent,
        change: circleRangeSliderEvent
    });

    document.querySelector(".rs-tooltip").style.margin = "-15.5px 0 0 -33.0547px";

    $("#color-rainbow-saturation-range").slider({
        min: 0,
        max: 100,
        range: true,
        slide: rangeSliderEvent,
        stop: rangeSliderEvent,
        change: rangeSliderEvent,
        values: [0, 100]
    });

    $("#color-rainbow-lightness-range").slider({
        min: 0,
        max: 100,
        range: true,
        slide: rangeSliderEvent,
        stop: rangeSliderEvent,
        change: rangeSliderEvent,
        values: [0, 100]
    });

    initializeDragAndDrop(themeCursor, null, "value");
    initializeDragAndDrop(themeLogo, null, "value");
    themeCursor.addEventListener("paste", uploadAndPaste);
    themeLogo.addEventListener("paste", uploadAndPaste);

    let oninput = e => document.getElementById(e.target.dataset.label).textContent = e.target.value;
    for (let input of themeColorRainbowWrapper.querySelectorAll("input[type=range][data-label]")) {
        input.addEventListener("input", oninput);
        document.getElementById(input.dataset.label).textContent = input.value;
    }

    for (let t of __defaultThemes) {
        allThemes[t.name] = t;
        defaultThemes.push(t.name);
    }

    chrome.storage.sync.get(["theme", "themes"], s => {
        // default theme is "Schoology Plus"
        s.theme = s.theme || "Schoology Plus";

        for (let t of s.themes || []) {
            allThemes[t.name] = t;
        }

        for (let t in allThemes) {
            let themeItem = createElement("a", ["collection-item", "theme-item"], {
                dataset: {
                    theme: t,
                },
                onclick: e => {
                    applyTheme(t);
                    for (let elem of themeItem.parentElement.children) {
                        elem.classList.remove("active");
                    }
                    themeItem.classList.add("active");
                }
            }, [createElement("span", t.length > 20 ? ["tooltipped"] : [], {
                textContent: t.length > 20 ? t.substr(0, 17) + "..." : t,
                dataset: {
                    tooltip: t.length > 20 ? t : ""
                }
            })]);

            let props = {
                textContent: "check",
                dataset: {
                    tooltip: "Apply Theme"
                },
                onclick: e => confirm(`Are you sure you want to apply the theme ${t}?`)
                    ? chrome.storage.sync.set({ theme: t }, () => location.href = "https://lms.lausd.net")
                    : e.stopPropagation()
            };
            let appliedProps = {
                textContent: "star",
                dataset: {
                    tooltip: "Theme Applied"
                },
                onclick: () => location.href = "https://lms.lausd.net"
            };

            function createActionButton(properties) {
                return createElement("i", ["material-icons", "right", "tooltipped"], properties);
            }

            themeItem.appendChild(createActionButton(t == s.theme ? appliedProps : props));

            if (!defaultThemes.includes(t)) {
                let shareButton = createActionButton({
                    textContent: "content_copy",
                    dataset: {
                        tooltip: "Copy Theme"
                    }
                });
                shareButton.addEventListener("click", e => {
                    copyThemeToClipboard(t);
                });
                themeItem.appendChild(createActionButton({ textContent: "delete", dataset: { tooltip: "Delete Theme" }, onclick: e => deleteTheme(t) || e.stopPropagation() }));
                themeItem.appendChild(shareButton);
                themeItem.appendChild(createActionButton({ textContent: "edit", dataset: { tooltip: "Edit Theme" }, onclick: () => editTheme(t) }));
            }

            themesList.appendChild(themeItem);
        }

        let selected = Array.from(themesList.children).find(x => x.childNodes[0].textContent == s.theme);
        (selected || themesList.firstElementChild).click();
        M.Tooltip.init(document.querySelectorAll('.tooltipped'), { outDuration: 0, inDuration: 300, enterDelay: 0, exitDelay: 10, transition: 10 });
    });
});
