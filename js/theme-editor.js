const lausdImageUrl = "https://cdn.schoology.com/system/files/imagecache/node_themes/sites/all/themes/schoology_theme/node_themes/424392825/BrandingUpdateLAUSD_59d2b7fc44916.png";
const defaultThemes = ["Schoology Plus", "LAUSD Orange", "Toy", "Rainbow"];

var allThemes;
var themeName = document.getElementById("theme-name");
var themeHue = document.getElementById("theme-hue");
var themePrimaryColor = document.getElementById("theme-primary-color");
var themeSecondaryColor = document.getElementById("theme-secondary-color");
var themeBackgroundColor = document.getElementById("theme-background-color");
var themeBorderColor = document.getElementById("theme-border-color");
var themeSchoologyLogo = document.getElementById("theme-schoology-logo");
var themeLAUSDLogo = document.getElementById("theme-lausd-logo");
var themeCustomLogo = document.getElementById("theme-custom-logo");
var themeLogo = document.getElementById("theme-logo");
var themeCursor = document.getElementById("theme-cursor");
var themeColorHue = document.getElementById("theme-color-hue");
var themeColorCustom = document.getElementById("theme-color-custom");
var themeColorCustomWrapper = document.getElementById("theme-color-custom-wrapper");
var themeHueWrapper = document.getElementById("theme-hue-wrapper");
var themeLogoWrapper = document.getElementById("theme-logo-wrapper");
var previewSection = document.getElementById("preview-section");
var lockIcon = document.getElementById("lock-icon");
var themesList = document.getElementById("themes-list");
var themesListSection = document.getElementById("themes-list-section");
var themeEditorSection = document.getElementById("theme-editor-section");
var themeIcons = document.getElementById("theme-icons");
themeIcons.addEventListener("input", e => updateOutput(e.target));
var saveButton = document.getElementById("save-button");
saveButton.addEventListener("click", e => saveTheme());
var saveCloseButton = document.getElementById("save-close-button");
saveCloseButton.addEventListener("click", e => saveTheme(true));
var discardButton = document.getElementById("discard-button");
discardButton.addEventListener("click", e => confirm("Are you sure you want to discard changes?") && location.reload());
var closeButton = document.getElementById("close-button");
closeButton.addEventListener("click", e => (!document.querySelector(".show-editor-controls") || confirm('Are you sure you want to close without saving?')) && (location.href = 'https://lms.lausd.net'));
var createButton = document.getElementById("create-button");
createButton.addEventListener("click", e => editTheme());
var lockButton = document.getElementById("lock-button");
lockButton.addEventListener("click", e => {
    if (previewSection.classList.contains("fixed-on-large-and-up")) {
        previewSection.classList.remove("fixed-on-large-and-up");
        lockButton.classList.remove("locked");
        lockButton.classList.add("btn");
        lockButton.classList.remove("btn-flat");
        lockIcon.textContent = "vertical_align_top";
    } else {
        previewSection.classList.add("fixed-on-large-and-up");
        lockButton.classList.add("locked");
        lockButton.classList.add("btn-flat");
        lockButton.classList.remove("btn");
        lockIcon.textContent = "vertical_align_center";
    }
});

var previewNavbar = document.getElementById("preview-navbar");
var previewLogo = document.getElementById("preview-logo");

let warnings = [];
let errors = [];
let theme = {};

var output = document.getElementById("json-output");
for (let e of document.querySelectorAll("#theme-editor-section input")) {
    e.addEventListener("input", function (event) {
        updateOutput(event.target);
    });
}
M.Tabs.init(document.querySelector(".tabs"));

function generateWarnings(j) {
    let w = [];
    if (!j.name) w.push("Theme must have a name")
    if (j.hue && Number.isNaN(Number.parseFloat(j.hue))) w.push("Value of 'hue' must be a number");
    if (j.colors && j.colors.length != 4) w.push("There must be four colors in 'colors'");
    if (j.colors && j.colors.map(x => !!validateColor(x)).includes(false)) w.push("One or more values of 'colors' is not a valid color");
    return w;
}

document.getElementById("json-output").addEventListener("input", t => {
    errors = [];
    warnings = [];
    j = parseJSONObject(t.target.value);
    importFromObject(j);
});

var origThemeName;

/**
 * Fills out form elements with the data contained in the provided Theme object
 * @param {{name:string,hue?:Number,colors?:string[],logo?:string,cursor?:string,icons?:Object}} j A SchoologyPlus theme object
 */
function importFromObject(j) {
    if (j) {
        warnings = generateWarnings(j)
        if (warnings.length > 0) {
            updatePreview(false);
            return;
        }

        themeName.value = j.name;

        themeHue.value = j.hue || "";
        if (j.hue) themeColorHue.click();

        if (j.colors) {
            ["primary-color", "background-color", "secondary-color", "border-color"].map((x, i) => $("#theme-" + x).spectrum("set", j.colors[i]));
            themeColorCustom.click();
        }

        if (!j.hue && !j.colors) themeColorHue.click();

        if (j.logo) {
            if (j.logo == "schoology") themeSchoologyLogo.click();
            else if (j.logo == "lausd") themeLAUSDLogo.click();
            else {
                themeLogo.value = j.logo;
                themeCustomLogo.click();
            }
        } else {
            themeSchoologyLogo.click();
        }

        if (j.icons) {
            themeIcons.value = JSON.stringify(j.icons);
        }

        themeCursor.value = j.cursor || "";
        updateOutput(themeCursor);

        M.updateTextFields();
        M.textareaAutoResize(themeIcons);
        updateOutput();
    } else {
        errors.push("The JSON you have entered is not valid");
        updatePreview(false);
    }
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

initPicker("theme-primary-color", (c) => updateOutput(themePrimaryColor, c));
initPicker("theme-secondary-color", (c) => updateOutput(themeSecondaryColor, c));
initPicker("theme-background-color", (c) => updateOutput(themeBackgroundColor, c));
initPicker("theme-border-color", (c) => updateOutput(themeBorderColor, c));

/**
 * Processes the values entered into the form
 * @param {HTMLElement} [target] Processes element-specific values for the provided element
 * @param {tinycolor} [color] A new color value for the specified element
 */
function updateOutput(target, color) {
    warnings = [];
    errors = [];
    let hue = undefined;
    theme = {
        name: themeName.value || undefined,
    }

    if (!theme.name) {
        errors.push("Theme must have a name")
    }

    if (themeColorHue.checked) {
        if ((hue = Number.parseFloat(themeHue.value)) || hue === 0) {
            theme.hue = hue;
            setCSSVariable("color-hue", hue);
        } else {
            setCSSVariable("color-hue", 210);
        }

        setCSSVariable("primary-color", "hsl(var(--color-hue), 50%, 50%)");
        setCSSVariable("background-color", "hsl(var(--color-hue), 60%, 55%)");
        setCSSVariable("hover-color", "hsl(var(--color-hue), 55%, 40%)");
        setCSSVariable("border-color", "hsl(var(--color-hue), 90%, 50%)");
    }

    switch (target) {
        case themeSchoologyLogo:
            theme.logo = "schoology";
            themeLogo.setAttribute("disabled", "");
            setCSSVariable("background-url", "none");
            previewLogo.classList.add("hide-background-image");
            previewLogo.classList.remove("custom-background-image");
            themeLogoWrapper.classList.add("hidden");
            break;
        case themeLAUSDLogo:
            theme.logo = "lausd";
            themeLogo.setAttribute("disabled", "");
            setCSSVariable("background-url", `url(${lausdImageUrl})`);
            previewLogo.classList.remove("hide-background-image");
            previewLogo.classList.add("custom-background-image");
            themeLogoWrapper.classList.add("hidden");
            break;
        case themeCustomLogo:
            themeLogo.removeAttribute("disabled");
            themeLogoWrapper.classList.remove("hidden");
            break;
        case themeColorHue:
            themeHue.removeAttribute("disabled");
            $(`#theme-primary-color`).spectrum("disable");
            $(`#theme-secondary-color`).spectrum("disable");
            $(`#theme-border-color`).spectrum("disable");
            $(`#theme-background-color`).spectrum("disable");
            themeColorCustomWrapper.classList.add("hidden");
            themeHueWrapper.classList.remove("hidden");
            break;
        case themeColorCustom:
            themeHue.setAttribute("disabled", "");
            themeColorCustomWrapper.classList.remove("hidden");
            themeHueWrapper.classList.add("hidden");
            $(`#theme-primary-color`).spectrum("enable");
            $(`#theme-secondary-color`).spectrum("enable");
            $(`#theme-border-color`).spectrum("enable");
            $(`#theme-background-color`).spectrum("enable");
            break;
    }

    if (themeCustomLogo.checked && themeLogo.value) {
        checkImage(themeLogo.value, (x) => {
            if (x.target.width != 160 || x.target.height != 36) {
                warnings.push("Logo image is not the recommended size of 160x36");
            }
            theme.logo = themeLogo.value;
            setCSSVariable("background-url", `url(${theme.logo})`);
            previewLogo.classList.remove("hide-background-image");
            previewLogo.classList.add("custom-background-image");
            updatePreview();
        }, (x) => {
            errors.push("Logo URL is invalid");
            setCSSVariable("background-url", "none");
            previewLogo.classList.add("hide-background-image");
            previewLogo.classList.remove("custom-background-image");
            updatePreview();
        });
    } else if (themeCustomLogo.checked) {
        errors.push("No logo URL specified");
    }


    if (themeCursor.value) {
        checkImage(themeCursor.value, (x) => {
            if (x.target.width > 128 || x.target.height > 128) {
                warnings.push("Cursor images must be smaller than 128x128 to appear");
            }
            theme.cursor = themeCursor.value;
            setCSSVariable("cursor", `url(${themeCursor.value}), auto`);
            updatePreview();
        }, (x) => {
            errors.push("Cursor URL is invalid");
            setCSSVariable("cursor", "auto");
            updatePreview();
        });
    } else {
        setCSSVariable("cursor", "auto");
    }

    if (theme.hue && (theme.hue < 0 || theme.hue > 359 || theme.hue != Math.floor(theme.hue))) {
        warnings.push("Hue should be a positive integer between 0 and 359");
    }

    if (themeColorCustom.checked) {
        let colors = [
            (target === themePrimaryColor && color) ? color.toHexString() : (themePrimaryColor.value || "red"),
            (target === themeBackgroundColor && color) ? color.toHexString() : (themeBackgroundColor.value || "yellow"),
            (target === themeSecondaryColor && color) ? color.toHexString() : (themeSecondaryColor.value || "blue"),
            (target === themeBorderColor && color) ? color.toHexString() : (themeBorderColor.value || "green"),
        ];

        let colorMappings = ["primary-color", "background-color", "hover-color", "border-color"];

        let valid = true;
        let validCount = 0;
        for (let i = 0; i < colors.length; i++) {
            let cc = validateColor(colors[i]);
            if (!cc) {
                valid = false;
                document.documentElement.style.removeProperty(`--${colorMappings[i]}`);
            } else {
                validCount++;
                setCSSVariable(colorMappings[i], cc);
                colors[i] == cc;
            }
        }

        if (valid && validCount > 0) {
            theme.colors = colors;
        } else if (colors.filter(x => x).length > 0) {
            errors.push("One or more of your specified colors is invalid");
        } else if (validCount > 0) {
            warnings.push("All four colors must be specified")
        }

        if (theme.colors && theme.hue) {
            warnings.push("Your specified hue value will be overridden by your other color choices");
        }
    }

    if (themeIcons.value) {
        let j = parseJSONObject(themeIcons.value);
        if (j) {
            theme.icons = j;
        } else {
            errors.push("Value for icons is not a valid JSON object");
        }
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
    var img = new Image();
    img.onload = validCallback;
    img.onerror = invalidCallback;
    img.src = imageSrc;
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

let rainbowInterval = null;
/**
 * Applies the theme with the given name
 * @param {string} t The theme's name
 */
function applyTheme(t) {
    clearInterval(rainbowInterval);
    if (t == "Rainbow") {
        rainbowInterval = setInterval(rainbow, 100);
        importFromObject({ name: "Rainbow", hue: (new Date().valueOf() / 100) % 360 });
    } else if (allThemes[t]) {
        importFromObject(allThemes[t]);
    }
}

/**
 * Deletes a theme with the given name from the Chrome Sync Storage
 * @param {string} name The theme's name
 */
function deleteTheme(name) {
    let allUserThemes = Object.values(allThemes).slice(4);
    if (confirm(`Are you sure you want to delete the theme "${name}"?\nThe page will reload when the theme is deleted.`)) {
        chrome.storage.sync.set({ themes: allUserThemes.filter(x => x.name != name) }, () => window.location.reload());
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
    origThemeName = name;
}

/**
 * Cycles the color of the interface
 */
function rainbow() {
    let hue = (new Date().valueOf() / 100) % 360;
    document.documentElement.style.setProperty("--color-hue", hue);
    document.documentElement.style.setProperty("--primary-color", "hsl(var(--color-hue), 50%, 50%)");
    document.documentElement.style.setProperty("--background-color", "hsl(var(--color-hue), 60%, 55%)");
    document.documentElement.style.setProperty("--hover-color", "hsl(var(--color-hue), 55%, 40%)");
    document.documentElement.style.setProperty("--border-color", "hsl(var(--color-hue), 90%, 50%)");
}

$(document).ready(function () {
    updateOutput(document.rootElement);

    chrome.storage.sync.get(["theme", "themes"], s => {
        allThemes = {
            "Schoology Plus": {
                name: "Schoology Plus",
                hue: 210
            },
            "Rainbow": undefined,
            "Toy": {
                name: "Toy",
                hue: 150,
                cursor: "https://raw.githubusercontent.com/aopell/SchoologyPlus/master/imgs/toy-mode.png"
            },
            "LAUSD Orange": {
                name: "LAUSD Orange",
                colors: [
                    "#FF7A00",
                    "#FF8A10",
                    "#FF9A20",
                    "#DF5A00"
                ],
                logo: "lausd"
            }
        };
        for (let t of s.themes || []) {
            allThemes[t.name] = t;
        }
        for (let t in allThemes) {
            let themeItem = createElement("a", ["collection-item", "theme-item"], {
                textContent: t,
                onclick: e => {
                    applyTheme(t);
                    for (let elem of e.target.parentElement.children) {
                        elem.classList.remove("active");
                    }
                    e.target.classList.add("active");
                }
            });

            let props = { textContent: "check", dataset: { tooltip: "Apply Theme" }, onclick: e => confirm(`Are you sure you want to apply the theme ${t}?`) ? chrome.storage.sync.set({ theme: t }, () => location.href = "https://lms.lausd.net") : e.stopPropagation() };
            let appliedProps = { textContent: "star", dataset: { tooltip: "Theme Applied" }, onclick: () => location.href = "https://lms.lausd.net" };

            themeItem.appendChild(createElement("i", ["material-icons", "right", "tooltipped"], t == s.theme ? appliedProps : props));

            if (!defaultThemes.includes(t)) {
                themeItem.appendChild(createElement("i", ["material-icons", "right", "tooltipped"], { textContent: "delete", dataset: { tooltip: "Delete Theme" }, onclick: e => deleteTheme(t) || e.stopPropagation() }));
                themeItem.appendChild(createElement("i", ["material-icons", "right", "tooltipped"], { textContent: "edit", dataset: { tooltip: "Edit Theme" }, onclick: () => editTheme(t) }));
            }

            themesList.appendChild(themeItem);
        }

        let selected = Array.from(themesList.children).find(x => x.childNodes[0].textContent == s.theme);
        (selected || themesList.firstElementChild).click();
        M.Tooltip.init(document.querySelectorAll('.tooltipped'), { outDuration: 0, inDuration: 300, enterDelay: 0, exitDelay: 10, transition: 10 });
    });
});