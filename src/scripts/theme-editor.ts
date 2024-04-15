import $ from "jquery";
import M from "materialize-css";
import "spectrum-colorpicker";

import { initializeAnalytics, trackEvent } from "./utils/analytics";
import { DEFAULT_ICONS } from "./utils/default-icons";
import { CLASSIC_THEMES, DEFAULT_THEMES, LAUSD_THEMES } from "./utils/default-themes";
import { DeepPartial, createElement, setCSSVariable } from "./utils/dom";
import { Logger } from "./utils/logger";
import {
    CustomColorDefinition,
    ModernColorDefinition,
    ModernInterfaceColorDefinition,
    ModernOptionsDefinition,
    ModernTextColorDefinition,
    RainbowColorComponentAnimation,
    RainbowColorComponentDefinition,
    RainbowColorDefinition,
    SchoologyTheme,
    SchoologyThemeV2,
    ThemeColor,
    ThemeCursor,
    ThemeIcon,
    ThemeLogo,
} from "./utils/theme-model";

const schoologyPlusLogoImageUrl = chrome.runtime.getURL("/imgs/schoology-plus-wide.svg");
const schoologyLogoImageUrl =
    "https://ui.schoology.com/design-system/assets/schoology-logo-horizontal-white.884fbe559c66e06d28c5cfcbd4044f0e.svg";
const lausdLegacyImageUrl = chrome.runtime.getURL("/imgs/lausd-legacy.png");
const lausd2019ImageUrl = chrome.runtime.getURL("/imgs/lausd-2019.png");
const lausd2022ImageUrl = chrome.runtime.getURL("/imgs/lausd-2022.png");
const CURRENT_VERSION = SchoologyTheme.CURRENT_VERSION;
const placeholderUrl = "https://via.placeholder.com/200x50?text=School+Logo";

var defaultDomain = "app.schoology.com";
var __storage: Record<string, any> = {};

declare global {
    interface JQuery<TElement = HTMLElement> {
        roundSlider(options: any): void;
        roundSlider(method: string, value: string): void;
        roundSlider(getValue: "getValue"): string;
        spectrum(method: string, value: string): void;
        spectrum(options: any): void;
        spectrum(get: "get"): { toHexString: () => string; isDark: () => boolean };
    }
}

async function load() {
    initializeAnalytics();

    __storage = await chrome.storage.sync.get(null);
    defaultDomain = __storage.defaultDomain || "app.schoology.com";

    if (isLAUSD()) {
        setCSSVariable("lausd-visible", "block");
        setCSSVariable("lausd-hidden", "none");
    } else {
        setCSSVariable("lausd-visible", "none");
        setCSSVariable("lausd-hidden", "block");
    }

    $.fn.roundSlider.prototype._invertRange = true;

    $("#theme-hue").slider({
        min: 0,
        max: 359,
        slide: hueSliderEvent,
        stop: hueSliderEvent,
        change: hueSliderEvent,
    });

    $(colorRainbowHueValue).slider({
        min: 0,
        max: 359,
        slide: hueSliderEvent,
        stop: hueSliderEvent,
        change: hueSliderEvent,
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
        change: circleRangeSliderEvent,
    });

    document.querySelector<HTMLElement>(".rs-tooltip")!.style.margin = "-15.5px 0 0 -33.0547px";

    $("#color-rainbow-saturation-range").slider({
        min: 0,
        max: 100,
        range: true,
        slide: rangeSliderEvent,
        stop: rangeSliderEvent,
        change: rangeSliderEvent,
        values: [0, 100],
    });

    $("#color-rainbow-lightness-range").slider({
        min: 0,
        max: 100,
        range: true,
        slide: rangeSliderEvent,
        stop: rangeSliderEvent,
        change: rangeSliderEvent,
        values: [0, 100],
    });

    initializeDragAndDrop(themeCursor, null, "value");
    initializeDragAndDrop(themeLogo, null, "value");
    themeCursor.addEventListener("paste", uploadAndPaste);
    themeLogo.addEventListener("paste", uploadAndPaste);

    let oninput = (e: Event) =>
        (document.getElementById((e.target as HTMLElement).dataset.label!)!.textContent = (
            e.target as HTMLInputElement
        ).value);
    for (let input of document.querySelectorAll<HTMLInputElement>(
        "input[type=range][data-label]"
    )) {
        input.addEventListener("input", oninput);
        document.getElementById(input.dataset.label!)!.textContent = input.value;
    }

    for (let t of DEFAULT_THEMES) {
        defaultThemes.push(t.name);
        if (!isLAUSD() && LAUSD_THEMES.includes(t.name)) {
            continue;
        }
        allThemes[t.name] = t;
    }

    chrome.storage.sync.get(["theme", "themes"], s => {
        // default theme is "Schoology Plus"
        s.theme = s.theme || "Schoology Plus";

        for (let t of s.themes || []) {
            allThemes[t.name] = t;
        }

        for (let t in allThemes) {
            let themeItem = createElement(
                "a",
                ["collection-item", "theme-item"],
                {
                    dataset: {
                        theme: t,
                    },
                    onclick: e => {
                        applyTheme(t);
                        for (let elem of themeItem.parentElement?.children ?? []) {
                            elem.classList.remove("active");
                        }
                        themeItem.classList.add("active");
                    },
                },
                [
                    createElement("span", ["tooltipped"], {
                        textContent: t + (CLASSIC_THEMES.includes(t) ? " (Classic)" : ""),
                        dataset: {
                            tooltip: t + (CLASSIC_THEMES.includes(t) ? " (Classic)" : ""),
                        },
                    }),
                ]
            );

            let props = {
                textContent: "check",
                dataset: {
                    tooltip: "Apply Theme",
                },
                onclick: (e: Event) => {
                    e.stopPropagation();
                    ConfirmModal.open(
                        "Apply Theme?",
                        `Are you sure you want to apply the theme ${t}?`,
                        ["Apply", "Cancel"],
                        b => {
                            if (b === "Apply") {
                                trackEvent("button_click", {
                                    id: "apply-theme",
                                    context: "Theme List",
                                    value: t,
                                    legacyTarget: `Theme: ${t}`,
                                    legacyAction: "apply",
                                    legacyLabel: "Theme List",
                                });
                                chrome.storage.sync.set(
                                    { theme: t },
                                    () => (location.href = `https://${defaultDomain}`)
                                );
                            }
                        }
                    );
                },
            };
            let appliedProps = {
                textContent: "star",
                dataset: {
                    tooltip: "Theme Applied",
                },
                onclick: () => (location.href = `https://${defaultDomain}`),
            };

            function createActionButton(properties: DeepPartial<HTMLElement>) {
                return createElement("i", ["material-icons", "right", "tooltipped"], properties);
            }

            let buttonsDiv = createElement("div", ["right"]);
            buttonsDiv.style.width = "160px";
            themeItem.appendChild(buttonsDiv);

            buttonsDiv.appendChild(createActionButton(t == s.theme ? appliedProps : props));

            let shareButton = createActionButton({
                textContent: "content_copy",
                dataset: {
                    tooltip: "Copy Theme to Clipboard",
                },
            });
            shareButton.addEventListener("click", e => {
                copyThemeToClipboard(t);
            });
            buttonsDiv.appendChild(shareButton);

            if (!defaultThemes.includes(t)) {
                buttonsDiv.appendChild(
                    createActionButton({
                        textContent: "delete",
                        dataset: { tooltip: "Delete Theme" },
                        onclick: e => {
                            deleteTheme(t);
                            e.stopPropagation();
                        },
                    })
                );
                buttonsDiv.appendChild(
                    createActionButton({
                        textContent: "edit",
                        dataset: { tooltip: "Edit Theme" },
                        onclick: () => editTheme(t),
                    })
                );
            }

            themesList.appendChild(themeItem);
        }

        let selected = Array.from(themesList.children).find(
            x => (x as HTMLElement).dataset.theme == s.theme
        );
        ((selected || themesList.firstElementChild) as HTMLInputElement).click();
        M.Tooltip.init(document.querySelectorAll(".tooltipped"), {
            outDuration: 0,
            inDuration: 300,
            enterDelay: 0,
            exitDelay: 10,
        });
        var elems = document.querySelectorAll(".fixed-action-btn");
        M.FloatingActionButton.init(elems, { direction: "left", hoverEnabled: false });
    });
}

load();

function isLAUSD() {
    return defaultDomain === "lms.lausd.net";
}

var allThemes: Record<string, SchoologyThemeV2> = {};
var defaultThemes: string[] = [];
var rainbowInterval: ReturnType<typeof setInterval> | undefined = undefined;
var themeName = document.getElementById("theme-name") as HTMLInputElement;
var themeHue = document.getElementById("theme-hue") as HTMLElement;
var themePrimaryColor = document.getElementById("theme-primary-color") as HTMLElement;
var themeSecondaryColor = document.getElementById("theme-secondary-color") as HTMLElement;
var themeBackgroundColor = document.getElementById("theme-background-color") as HTMLElement;
var themeBorderColor = document.getElementById("theme-border-color") as HTMLElement;
var themeLinkColor = document.getElementById("theme-link-color") as HTMLElement;
var themeSchoologyPlusLogo = document.getElementById(
    "theme-schoology-plus-logo"
) as HTMLInputElement;
var themeSchoologyLogo = document.getElementById("theme-schoology-logo") as HTMLInputElement;
var themeLAUSDLogo2022 = document.getElementById("theme-lausd-logo-2022") as HTMLInputElement;
var themeNewLAUSDLogo = document.getElementById("theme-new-lausd-logo") as HTMLInputElement;
var themeLAUSDLogo = document.getElementById("theme-lausd-logo") as HTMLInputElement;
var themeDefaultLogo = document.getElementById("theme-default-logo") as HTMLInputElement;
var themeCustomLogo = document.getElementById("theme-custom-logo") as HTMLInputElement;
var themeLogo = document.getElementById("theme-logo") as HTMLInputElement;
var themeCursor = document.getElementById("theme-cursor") as HTMLInputElement;
var themeColorHue = document.getElementById("theme-color-hue") as HTMLInputElement;
var themeColorCustom = document.getElementById("theme-color-custom") as HTMLInputElement;
var themeColorRainbow = document.getElementById("theme-color-rainbow") as HTMLInputElement;
var themeColorCustomWrapper = document.getElementById("theme-color-custom-wrapper") as HTMLElement;
var themeColorRainbowWrapper = document.getElementById(
    "theme-color-rainbow-wrapper"
) as HTMLElement;
var colorRainbowHueAnimate = document.getElementById(
    "color-rainbow-hue-animate"
) as HTMLInputElement;
var colorRainbowSaturationAnimate = document.getElementById(
    "color-rainbow-saturation-animate"
) as HTMLInputElement;
var colorRainbowLightnessAnimate = document.getElementById(
    "color-rainbow-lightness-animate"
) as HTMLInputElement;
var colorRainbowHueAnimateWrapper = document.getElementById(
    "color-rainbow-hue-animate-wrapper"
) as HTMLElement;
var colorRainbowSaturationAnimateWrapper = document.getElementById(
    "color-rainbow-saturation-animate-wrapper"
) as HTMLElement;
var colorRainbowLightnessAnimateWrapper = document.getElementById(
    "color-rainbow-lightness-animate-wrapper"
) as HTMLElement;
var colorRainbowHueSpeed = document.getElementById("color-rainbow-hue-speed") as HTMLInputElement;
var colorRainbowHueValue = document.getElementById("color-rainbow-hue-value") as HTMLInputElement;
var colorRainbowHuePreview = document.getElementById("color-rainbow-hue-preview") as HTMLElement;
var colorRainbowSaturationSpeed = document.getElementById(
    "color-rainbow-saturation-speed"
) as HTMLInputElement;
var colorRainbowSaturationValue = document.getElementById(
    "color-rainbow-saturation-value"
) as HTMLInputElement;
var colorRainbowLightnessSpeed = document.getElementById(
    "color-rainbow-lightness-speed"
) as HTMLInputElement;
var colorRainbowLightnessValue = document.getElementById(
    "color-rainbow-lightness-value"
) as HTMLInputElement;
var colorRainbowHueAlternate = document.getElementById(
    "color-rainbow-hue-alternate"
) as HTMLInputElement;
var colorRainbowSaturationAlternate = document.getElementById(
    "color-rainbow-saturation-alternate"
) as HTMLInputElement;
var colorRainbowLightnessAlternate = document.getElementById(
    "color-rainbow-lightness-alternate"
) as HTMLInputElement;
var colorRainbowHueRange = document.getElementById("color-rainbow-hue-range") as HTMLElement;
var colorRainbowSaturationRange = document.getElementById(
    "color-rainbow-saturation-range"
) as HTMLElement;
var colorRainbowLightnessRange = document.getElementById(
    "color-rainbow-lightness-range"
) as HTMLElement;
var themeHueWrapper = document.getElementById("theme-hue-wrapper") as HTMLElement;
var themeLogoWrapper = document.getElementById("theme-logo-wrapper") as HTMLElement;
var previewSection = document.getElementById("preview-section") as HTMLElement;
var themesList = document.getElementById("themes-list") as HTMLElement;
var themesListSection = document.getElementById("themes-list-section") as HTMLElement;
var themeEditorSection = document.getElementById("theme-editor-section") as HTMLElement;
var testIcon = document.getElementById("test-icon") as HTMLImageElement;
var iconList = document.getElementById("icon-list") as HTMLElement;
var tabIcons = document.getElementById("tab-icons") as HTMLElement;
/** @type {HTMLTableElement} */
var iconListTable = document.getElementById("icon-list-table") as HTMLTableElement;
var newIcon = document.getElementById("new-icon") as HTMLAnchorElement;
newIcon.addEventListener("click", addIcon);
var iconTestText = document.getElementById("icon-test-text") as HTMLInputElement;
iconTestText.addEventListener("input", iconPreview);
var saveButton = document.getElementById("save-button") as HTMLAnchorElement;
saveButton.addEventListener("click", e => trySaveTheme());
var saveCloseButton = document.getElementById("save-close-button") as HTMLAnchorElement;
saveCloseButton.addEventListener("click", e => trySaveTheme(true));
var discardButton = document.getElementById("discard-button") as HTMLAnchorElement;
discardButton.addEventListener("click", e =>
    ConfirmModal.open(
        "Discard Changes?",
        "Are you sure you want to discard changes? All unsaved edits will be permanently lost.",
        ["Discard", "Cancel"],
        b => b === "Discard" && location.reload()
    )
);
var closeButton = document.getElementById("close-button") as HTMLAnchorElement;
closeButton.addEventListener(
    "click",
    e =>
        (!inEditMode() && (location.href = `https://${defaultDomain}`)) ||
        ConfirmModal.open(
            "Discard Changes?",
            "Are you sure you want to close without saving? All unsaved edits will be permanently lost.",
            ["Discard", "Cancel"],
            b => b === "Discard" && (location.href = `https://${defaultDomain}`)
        )
);
var settingsButton = document.getElementById("settings-button") as HTMLAnchorElement;
settingsButton.addEventListener("click", e => SettingsModal.open());
var importButton = document.getElementById("import-button") as HTMLAnchorElement;
importButton.addEventListener("click", e => importTheme());
var createPresetDarkTheme = document.getElementById(
    "create-preset-dark-theme"
) as HTMLAnchorElement;
createPresetDarkTheme?.addEventListener("click", e =>
    editTheme("Schoology Plus Modern Dark", "My Dark Theme")
);
var createPresetLightTheme = document.getElementById(
    "create-preset-light-theme"
) as HTMLAnchorElement;
createPresetLightTheme?.addEventListener("click", e =>
    editTheme("Schoology Plus Modern Light", "My Light Theme")
);
var createPresetRainbowTheme = document.getElementById(
    "create-preset-rainbow-theme"
) as HTMLAnchorElement;
createPresetRainbowTheme?.addEventListener("click", e =>
    editTheme("Rainbow Modern", "My Rainbow Theme")
);
var createPresetClassicTheme = document.getElementById(
    "create-preset-classic-theme"
) as HTMLAnchorElement;
createPresetClassicTheme.addEventListener("click", e =>
    editTheme("Schoology Plus", "My Classic Theme")
);
var previewNavbar = document.getElementById("preview-navbar") as HTMLElement;
var previewLogo = document.getElementById("preview-logo") as HTMLElement;
var previewPage = document.getElementById("preview-page") as HTMLElement;
var lastSelectedTemplate: string | null = null;

var modernEnable = document.getElementById("modern-enable") as HTMLInputElement;
modernEnable.addEventListener("click", e =>
    trackEvent("update_setting", {
        id: "modern-enable",
        context: "Theme Editor",
        value: modernEnable.checked.toString(),
        legacyTarget: "modern-enable",
        legacyAction: modernEnable.checked.toString(),
        legacyLabel: "Theme Editor",
    })
);
var modernWrapper = document.getElementById("modern-wrapper") as HTMLElement;
var modernBorderRadiusValue = document.getElementById(
    "modern-border-radius-value"
) as HTMLInputElement;
var modernBorderSizeValue = document.getElementById("modern-border-size-value") as HTMLInputElement;
var modernPaddingValue = document.getElementById("modern-padding-value") as HTMLInputElement;

var previewModal = document.getElementById("preview-modal") as HTMLElement;
var splusModalClose = document.getElementById("splus-modal-close") as HTMLAnchorElement;
splusModalClose.addEventListener("click", e => {
    e.stopPropagation();
    previewModal.classList.add("hidden");
    previewPage.classList.remove("hidden");
    trackEvent("button_click", {
        id: "close-preview-modal",
        context: "Theme Editor",
        legacyTarget: "splus-modal-close",
        legacyAction: "click",
        legacyLabel: "Theme Editor",
    });
});
var previewSPlusButton = document.getElementById("preview-splus-button") as HTMLAnchorElement;
previewSPlusButton.addEventListener("click", e => {
    e.stopPropagation();
    previewModal.classList.toggle("hidden");
    previewPage.classList.toggle("hidden");
    trackEvent("button_click", {
        id: "preview-splus-button",
        context: "Theme Editor",
        legacyTarget: "preview-splus-button",
        legacyAction: "click",
        legacyLabel: "Theme Editor",
    });
});

class ThemeEditorModal {
    static get ELEMENT() {
        return document.getElementById("modal") as HTMLElement;
    }

    static get CONTENT_CONTAINER() {
        return document.getElementById("modal-content") as HTMLElement;
    }

    static get BUTTONS_CONTAINER() {
        return document.getElementById("modal-buttons") as HTMLElement;
    }

    /**
     * Displays a modal with the given content and buttons, calling callback on close
     * @param {Node} content The content of the modal
     * @param {string[]} buttons Buttons to show in the modal footer
     * @param {(button:string)=>void} callback Called on close with the selected button (or `null` if none selected)
     */
    static open(
        content: Node,
        buttons: string[] = ["OK"],
        callback?: (button: string | null) => void
    ) {
        ThemeEditorModal.CONTENT_CONTAINER.innerHTML = "";
        ThemeEditorModal.BUTTONS_CONTAINER.innerHTML = "";

        var selected: string | null = null;

        ThemeEditorModal.CONTENT_CONTAINER.appendChild(content);
        for (let b of buttons) {
            ThemeEditorModal.BUTTONS_CONTAINER.appendChild(
                createElement("a", ["modal-close", "waves-effect", "waves-dark", "btn-flat"], {
                    textContent: b,
                    onclick: e => {
                        trackEvent("button_click", {
                            id: "modal-button",
                            context: "Theme Editor",
                            value: b,
                            legacyTarget: "Modal Button",
                            legacyAction: b,
                            legacyLabel: "Theme Editor",
                        });
                        selected = b;
                    },
                })
            );
        }

        let controller = M.Modal.init(ThemeEditorModal.ELEMENT, {
            onCloseEnd: () => callback && callback(selected),
        });
        controller.open();
    }
}

class PromptModal {
    /**
     * Opens a modal requesting user input
     * @param {string} title The title of the modal
     * @param {string} placeholder Text displayed as a placeholder in the textbox
     * @param {string[]} buttons Buttons to display in the modal footer
     * @param {(button:string,text:string)=>void} callback Called on close with the selected button (or `null` if none selected) and the text in the textbox
     */
    static open(
        title: string,
        placeholder: string,
        buttons: string[],
        callback: (button: string | null, text: string) => void
    ) {
        let content = htmlToElement(`
        <div>
            <h4>${title}</h4>
            <div class="input-field">
                <textarea id="prompt-modal-textarea" class="materialize-textarea"></textarea>
                <label for="prompt-modal-textarea">${placeholder}</label>
            </div>
        </div>
        `);

        ThemeEditorModal.open(content, buttons, button =>
            callback(
                button,
                (document.getElementById("prompt-modal-textarea") as HTMLTextAreaElement).value
            )
        );
    }
}

class ConfirmModal {
    /**
     * Opens a modal requesting user confirmation
     * @param {string} title The title of the modal
     * @param {string} text Informative text detailing the question
     * @param {string[]} buttons Buttons to display in the modal footer
     * @param {(button:string)=>void} callback Called on close with the selected button (or `null` if none selected)
     */
    static open(
        title: string,
        text: string,
        buttons: string[],
        callback?: (button: string | null) => void
    ) {
        let content = htmlToElement(`
        <div>
            <h4>${title}</h4>
            <p>${text}</p>
        </div>
        `);

        ThemeEditorModal.open(content, buttons, callback);
    }
}

class SettingsModal {
    /**
     * Opens the settings modal
     */
    static open() {
        let content = htmlToElement(`
        <div>
            <h4>Settings</h4>
            <p>
                Nothing to see here yet! Theme editor settings coming soon&trade;.
            </p>
        </div>
        `);

        ThemeEditorModal.open(content, ["Cancel", "Save"], button => {
            switch (button) {
                case "Save":
                    break;
                case "Cancel":
                default:
                    break;
            }
        });
    }
}

var origThemeName: string;
let warnings: string[] = [];
let errors: string[] = [];
let theme: SchoologyTheme | null = null;

var output = document.getElementById("json-output") as HTMLTextAreaElement;
output.addEventListener("input", importThemeFromOutput);
output.addEventListener("paste", e => {
    if (inEditMode()) {
        e.preventDefault();
        e.stopPropagation();
        let t = e.clipboardData!.getData("text");
        output.value = t;
        importThemeFromOutput();
    }
});

for (let e of document.querySelectorAll("#theme-editor-section input")) {
    e.addEventListener("input", function (event) {
        updateOutput();
    });
}
var mTabs = M.Tabs.init(document.querySelector(".tabs")!, {
    onShow: function (newtab) {
        if (newtab.id == "tab-preview") {
            previewSection.classList.add("fixed-on-large-and-up");
        } else {
            previewSection.classList.remove("fixed-on-large-and-up");
        }
    },
});

var elems = document.querySelectorAll(".dropdown-trigger");
var instances = M.Dropdown.init(elems, { constrainWidth: false });

/**
 * Returns a list of errors for the given theme
 * @param {*} j Theme JSON object
 */
function generateErrors(j: SchoologyThemeV2) {
    let w = [];
    switch (j.version) {
        case 2:
            if (!j.name) w.push("Theme must have a name");
            break;
    }
    return w;
}

/**
 * Loads a theme from the JSON text displayed in the output textarea element
 */
function importThemeFromOutput() {
    importAndRender(parseJSONObject(output.value));
}

/**
 * Loads a theme from an object and renders it
 * @param {*} object JSON object representation of a theme
 */
function importAndRender(object: Object | false) {
    errors = [];
    warnings = [];
    renderTheme(importThemeFromObject(object));
}

/**
 * Migrates a theme to the newest version of the theme specification
 * @param {*} t Theme JSON object
 */
function migrateTheme(t: SchoologyThemeV2): SchoologyThemeV2 {
    switch (t.version) {
        case 2:
            break;
    }
    return t.version == CURRENT_VERSION ? t : migrateTheme(t);
}

/**
 * Fills out form elements with the data contained in the provided Theme object
 * @param {SchoologyThemeV2} j A SchoologyPlus theme object
 */
function importThemeFromObject(j: Object | false) {
    if (!j) {
        errors.push("The JSON you have entered is not valid");
        updatePreview(false);
        return;
    }

    errors = generateErrors(j as SchoologyThemeV2);
    if (errors.length > 0) {
        updatePreview(false);
        return;
    }

    let migratedTheme = migrateTheme(j as SchoologyThemeV2);

    return SchoologyTheme.loadFromObject(migratedTheme);
}

/**
 * Updates form elements with values from the provided theme
 * @param {SchoologyTheme} t The theme to render
 */
function renderTheme(t?: SchoologyTheme) {
    if (!t) {
        return;
    }

    themeName.value = t.name;
    themeLogo.value = "";
    switch (t.logo?.preset) {
        case "schoology_plus":
            themeSchoologyPlusLogo.click();
            break;
        case "schoology_logo":
            themeSchoologyLogo.click();
            break;
        case "lausd_legacy":
            themeLAUSDLogo.click();
            break;
        case "lausd_2019":
            themeNewLAUSDLogo.click();
            break;
        case "lausd_2022":
            themeLAUSDLogo2022.click();
            break;
        case "default":
            themeDefaultLogo.click();
            break;
        default:
            themeLogo.value = t.logo?.url ?? "";
            themeCustomLogo.click();
            break;
    }

    $(themeHue).slider("value", t.color.hue || 200);
    colorRainbowHueAnimate.checked = false;
    colorRainbowHueSpeed.value = "50";
    $(colorRainbowHueRange).roundSlider("setValue", "0,359");
    colorRainbowHueAlternate.checked = false;
    $(colorRainbowHueValue).slider("value", 180);
    colorRainbowSaturationAnimate.checked = false;
    colorRainbowSaturationSpeed.value = "50";
    $(colorRainbowSaturationRange).slider("values", [0, 100]);
    colorRainbowSaturationAlternate.checked = false;
    colorRainbowSaturationValue.value = "50";
    colorRainbowLightnessAnimate.checked = false;
    colorRainbowLightnessSpeed.value = "50";
    $(colorRainbowLightnessRange).slider("values", [0, 100]);
    colorRainbowLightnessAlternate.checked = false;
    colorRainbowLightnessValue.value = "50";
    if (t.color.hue || t.color.hue === 0) {
        themeColorHue.click();
    } else if (t.color.custom) {
        let map: Record<string, keyof CustomColorDefinition> = {
            "#theme-primary-color": "primary",
            "#theme-background-color": "background",
            "#theme-secondary-color": "hover",
            "#theme-border-color": "border",
            "#theme-link-color": "link",
        };
        Object.keys(map).map(x => $(x).spectrum("set", t.color.custom![map[x]]));
        themeColorCustom.click();
    } else if (t.color.rainbow) {
        themeColorRainbow.click();
        if (!!t.color.rainbow.hue?.animate !== colorRainbowHueAnimate.checked) {
            colorRainbowHueAnimate.click();
        }
        if (t.color.rainbow.hue?.animate) {
            colorRainbowHueSpeed.value = t.color.rainbow.hue.animate.speed.toString();
            $(colorRainbowHueValue).slider("value", t.color.rainbow.hue.animate.offset);
            if (!!t.color.rainbow.hue.animate.alternate !== colorRainbowHueAlternate.checked) {
                colorRainbowHueAlternate.click();
            }
            let l =
                t.color.rainbow.hue.animate.min ||
                (0 &&
                    t.color.rainbow.hue.animate.min >= 0 &&
                    t.color.rainbow.hue.animate.min <= 359)
                    ? t.color.rainbow.hue.animate.min
                    : 0;
            let u =
                t.color.rainbow.hue.animate.max &&
                t.color.rainbow.hue.animate.max >= 0 &&
                t.color.rainbow.hue.animate.max <= 359
                    ? t.color.rainbow.hue.animate.max
                    : 359;
            $(colorRainbowHueRange).roundSlider("setValue", `${l},${u}`);
        } else {
            $(colorRainbowHueValue).slider("value", t.color.rainbow.hue?.value ?? 0);
        }
        if (!!t.color.rainbow.saturation?.animate !== colorRainbowSaturationAnimate.checked) {
            colorRainbowSaturationAnimate.click();
        }
        if (t.color.rainbow.saturation?.animate) {
            colorRainbowSaturationSpeed.value = t.color.rainbow.saturation.animate.speed.toString();
            colorRainbowSaturationValue.value =
                t.color.rainbow.saturation.animate.offset.toString();
            if (
                !!t.color.rainbow.saturation.animate.alternate !==
                colorRainbowSaturationAlternate.checked
            ) {
                colorRainbowSaturationAlternate.click();
            }
            $(colorRainbowSaturationRange).slider("values", [
                t.color.rainbow.saturation.animate.min &&
                t.color.rainbow.saturation.animate.min < t.color.rainbow.saturation.animate.max &&
                t.color.rainbow.saturation.animate.min >= 0 &&
                t.color.rainbow.saturation.animate.min <= 100
                    ? t.color.rainbow.saturation.animate.min
                    : 0,
                t.color.rainbow.saturation.animate.max &&
                t.color.rainbow.saturation.animate.max > t.color.rainbow.saturation.animate.min &&
                t.color.rainbow.saturation.animate.max >= 0 &&
                t.color.rainbow.saturation.animate.max <= 100
                    ? t.color.rainbow.saturation.animate.max
                    : 100,
            ]);
        } else {
            colorRainbowSaturationValue.value =
                t.color.rainbow.saturation?.value?.toString() ?? "0";
        }
        if (!!t.color.rainbow.lightness?.animate !== colorRainbowLightnessAnimate.checked) {
            colorRainbowLightnessAnimate.click();
        }
        if (t.color.rainbow.lightness?.animate) {
            colorRainbowLightnessSpeed.value = t.color.rainbow.lightness.animate.speed.toString();
            colorRainbowLightnessValue.value = t.color.rainbow.lightness.animate.offset.toString();
            if (
                !!t.color.rainbow.lightness.animate.alternate !==
                colorRainbowLightnessAlternate.checked
            ) {
                colorRainbowLightnessAlternate.click();
            }
            $(colorRainbowLightnessRange).slider("values", [
                t.color.rainbow.lightness.animate.min &&
                t.color.rainbow.lightness.animate.min < t.color.rainbow.lightness.animate.max &&
                t.color.rainbow.lightness.animate.min >= 0 &&
                t.color.rainbow.lightness.animate.min <= 100
                    ? t.color.rainbow.lightness.animate.min
                    : 0,
                t.color.rainbow.lightness.animate.max &&
                t.color.rainbow.lightness.animate.max > t.color.rainbow.lightness.animate.min &&
                t.color.rainbow.lightness.animate.max >= 0 &&
                t.color.rainbow.lightness.animate.max <= 100
                    ? t.color.rainbow.lightness.animate.max
                    : 100,
            ]);
        } else {
            colorRainbowLightnessValue.value = t.color.rainbow.lightness?.value?.toString() ?? "0";
        }
    }

    if (t.color.modern) {
        modernEnable.checked = true;
        Object.keys(modernColorMap).map(x => {
            let modernOption = t.color.modern![modernColorMap[x][0]];
            $(x).spectrum(
                "set",
                modernOption?.[modernColorMap[x][1] as keyof typeof modernOption] ?? "#00DEAD"
            );
        });

        modernBorderRadiusValue.value = t.color.modern.options?.borderRadius?.toString() ?? "5";
        modernBorderSizeValue.value = t.color.modern.options?.borderSize?.toString() ?? "1";
        modernPaddingValue.value = t.color.modern.options?.padding?.toString() ?? "5";
    } else {
        modernEnable.checked = false;
    }

    for (let el of document.querySelectorAll(
        "input[type=range][data-label]"
    ) as NodeListOf<HTMLInputElement>) {
        document.getElementById(el.dataset.label!)!.textContent = el.value;
    }
    for (let el of [colorRainbowSaturationRange, colorRainbowLightnessRange]) {
        document.getElementById(el.id + "-display")!.textContent = `${
            $(el).slider("values")[0]
        } - ${$(el).slider("values")[1]}`;
    }
    iconList.innerHTML = "";
    if (t.icons) {
        for (let i of t.icons) {
            let row = addIcon();
            row.querySelector<HTMLElement>(".class-name")!.textContent = i.regex.toString();
            row.querySelector<HTMLElement>(".icon-url")!.textContent = i.url;
            row.querySelector<HTMLImageElement>(".small-icon-preview")!.src = i.url;
        }
    }
    themeCursor.value = "";
    if (t.cursor && t.cursor.primary) {
        themeCursor.value = t.cursor.primary;
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
function initPicker(
    id: string,
    color?: string,
    onupdate: (tinycolor: string) => void = updateOutput,
    showAlpha = false
) {
    $(`#${id}`).spectrum({
        showInput: true,
        containerClassName: "full-spectrum",
        showInitial: true,
        showPalette: true,
        showSelectionPalette: true,
        maxPaletteSize: 10,
        preferredFormat: "hex",
        showAlpha: showAlpha,
        color: color || ["red", "blue", "yellow", "green", "magenta"][init++ % 5],
        move: function (color: string) {
            onupdate(color);
        },
        hide: function (color: string) {
            onupdate(color);
        },

        palette: [
            [
                "rgb(0, 0, 0)",
                "rgb(67, 67, 67)",
                "rgb(102, 102, 102)" /*"rgb(153, 153, 153)","rgb(183, 183, 183)",*/,
                "rgb(204, 204, 204)",
                "rgb(217, 217, 217)",
                /*"rgb(239, 239, 239)", "rgb(243, 243, 243)",*/ "rgb(255, 255, 255)",
            ],
            [
                "rgb(152, 0, 0)",
                "rgb(255, 0, 0)",
                "rgb(255, 153, 0)",
                "rgb(255, 255, 0)",
                "rgb(0, 255, 0)",
                "rgb(0, 255, 255)",
                "rgb(74, 134, 232)",
                "rgb(0, 0, 255)",
                "rgb(153, 0, 255)",
                "rgb(255, 0, 255)",
            ],
            [
                "rgb(230, 184, 175)",
                "rgb(244, 204, 204)",
                "rgb(252, 229, 205)",
                "rgb(255, 242, 204)",
                "rgb(217, 234, 211)",
                "rgb(208, 224, 227)",
                "rgb(201, 218, 248)",
                "rgb(207, 226, 243)",
                "rgb(217, 210, 233)",
                "rgb(234, 209, 220)",
            ],
            [
                "rgb(221, 126, 107)",
                "rgb(234, 153, 153)",
                "rgb(249, 203, 156)",
                "rgb(255, 229, 153)",
                "rgb(182, 215, 168)",
                "rgb(162, 196, 201)",
                "rgb(164, 194, 244)",
                "rgb(159, 197, 232)",
                "rgb(180, 167, 214)",
                "rgb(213, 166, 189)",
            ],
            [
                "rgb(204, 65, 37)",
                "rgb(224, 102, 102)",
                "rgb(246, 178, 107)",
                "rgb(255, 217, 102)",
                "rgb(147, 196, 125)",
                "rgb(118, 165, 175)",
                "rgb(109, 158, 235)",
                "rgb(111, 168, 220)",
                "rgb(142, 124, 195)",
                "rgb(194, 123, 160)",
            ],
            [
                "rgb(166, 28, 0)",
                "rgb(204, 0, 0)",
                "rgb(230, 145, 56)",
                "rgb(241, 194, 50)",
                "rgb(106, 168, 79)",
                "rgb(69, 129, 142)",
                "rgb(60, 120, 216)",
                "rgb(61, 133, 198)",
                "rgb(103, 78, 167)",
                "rgb(166, 77, 121)",
            ],
            [
                "rgb(133, 32, 12)",
                "rgb(153, 0, 0)",
                "rgb(180, 95, 6)",
                "rgb(191, 144, 0)",
                "rgb(56, 118, 29)",
                "rgb(19, 79, 92)",
                "rgb(17, 85, 204)",
                "rgb(11, 83, 148)",
                "rgb(53, 28, 117)",
                "rgb(116, 27, 71)",
            ],
            [
                "rgb(91, 15, 0)",
                "rgb(102, 0, 0)",
                "rgb(120, 63, 4)",
                "rgb(127, 96, 0)",
                "rgb(39, 78, 19)",
                "rgb(12, 52, 61)",
                "rgb(28, 69, 135)",
                "rgb(7, 55, 99)",
                "rgb(32, 18, 77)",
                "rgb(76, 17, 48)",
            ],
        ],
    });
}

initPicker("theme-primary-color");
initPicker("theme-secondary-color");
initPicker("theme-background-color");
initPicker("theme-border-color");
initPicker("theme-link-color");

initPicker("modern-color-primary", "#EAEAEA");
initPicker("modern-color-accent", "#F7F7F7");
initPicker("modern-color-secondary", "#DDD");
initPicker("modern-color-input", "#D0D0D0");
initPicker("modern-color-border", "#BABABA");
initPicker("modern-color-highlight", "rgba(255, 183, 2, 0.2)", updateOutput, true);
initPicker("modern-color-active", "#98d4e4", updateOutput, true);
initPicker("modern-color-grades", "#009400");
initPicker("modern-color-error", "#F44336");

initPicker("modern-cal-1", "#d6e7f4");
initPicker("modern-cal-2", "#d7e8cf");
initPicker("modern-cal-3", "#f9e9d4");
initPicker("modern-cal-4", "#e7e0e5");
initPicker("modern-cal-5", "#e6b5c9");
initPicker("modern-cal-6", "#f9f1cf");
initPicker("modern-cal-7", "#daf0f9");
initPicker("modern-cal-8", "#f9ddea");
initPicker("modern-cal-9", "#fbd7d8");
initPicker("modern-cal-10", "#f1f2d1");
initPicker("modern-cal-11", "#e0e8f5");
initPicker("modern-cal-12", "#fbd7e4");
initPicker("modern-cal-13", "#fcddd3");
initPicker("modern-cal-14", "#e7f2d5");
initPicker("modern-cal-15", "#e6e0ee");
initPicker("modern-cal-16", "#f0e5db");
initPicker("modern-cal-17", "#fce8d1");
initPicker("modern-cal-18", "#e1f1e7");
initPicker("modern-cal-19", "#f0dfed");
initPicker("modern-cal-20", "#e9e9ea");

initPicker("modern-cal-21", "#00427c");
initPicker("modern-cal-22", "#603073");
initPicker("modern-cal-23", "#8b1941");
initPicker("modern-cal-24", "#970c0c");
initPicker("modern-cal-25", "#9c3b07");
initPicker("modern-cal-26", "#685203");
initPicker("modern-cal-27", "#2a5f16");
initPicker("modern-cal-28", "#09584f");
initPicker("modern-cal-29", "#005a75");
initPicker("modern-cal-30", "#4d5557");

initPicker("modern-color-text-primary", "#2A2A2A");
initPicker("modern-color-text-muted", "#677583");
initPicker("modern-color-text-contrast", "white");

var modernColorMap: Record<string, ["interface" | "text" | "calendar", string | number, string]> = {
    "#modern-color-primary": ["interface", "primary", "modern-primary"],
    "#modern-color-accent": ["interface", "accent", "modern-accent"],
    "#modern-color-secondary": ["interface", "secondary", "modern-secondary"],
    "#modern-color-input": ["interface", "input", "modern-input"],
    "#modern-color-border": ["interface", "border", "modern-contrast-border"],
    "#modern-color-highlight": ["interface", "highlight", "modern-highlight"],
    "#modern-color-active": ["interface", "active", "modern-active"],
    "#modern-color-grades": ["interface", "grades", "modern-grades"],
    "#modern-color-error": ["interface", "error", "modern-error"],
    "#modern-color-text-primary": ["text", "primary", "modern-text"],
    "#modern-color-text-muted": ["text", "muted", "modern-muted-text"],
    "#modern-color-text-contrast": ["text", "contrast", "modern-contrast-text"],
    "#modern-cal-1": ["calendar", 0, "cal1"],
    "#modern-cal-2": ["calendar", 1, "cal2"],
    "#modern-cal-3": ["calendar", 2, "cal3"],
    "#modern-cal-4": ["calendar", 3, "cal4"],
    "#modern-cal-5": ["calendar", 4, "cal5"],
    "#modern-cal-6": ["calendar", 5, "cal6"],
    "#modern-cal-7": ["calendar", 6, "cal7"],
    "#modern-cal-8": ["calendar", 7, "cal8"],
    "#modern-cal-9": ["calendar", 8, "cal9"],
    "#modern-cal-10": ["calendar", 9, "cal10"],
    "#modern-cal-11": ["calendar", 10, "cal11"],
    "#modern-cal-12": ["calendar", 11, "cal12"],
    "#modern-cal-13": ["calendar", 12, "cal13"],
    "#modern-cal-14": ["calendar", 13, "cal14"],
    "#modern-cal-15": ["calendar", 14, "cal15"],
    "#modern-cal-16": ["calendar", 15, "cal16"],
    "#modern-cal-17": ["calendar", 16, "cal17"],
    "#modern-cal-18": ["calendar", 17, "cal18"],
    "#modern-cal-19": ["calendar", 18, "cal19"],
    "#modern-cal-20": ["calendar", 19, "cal20"],
    "#modern-cal-21": ["calendar", 20, "cal21"],
    "#modern-cal-22": ["calendar", 21, "cal22"],
    "#modern-cal-23": ["calendar", 22, "cal23"],
    "#modern-cal-24": ["calendar", 23, "cal24"],
    "#modern-cal-25": ["calendar", 24, "cal25"],
    "#modern-cal-26": ["calendar", 25, "cal26"],
    "#modern-cal-27": ["calendar", 26, "cal27"],
    "#modern-cal-28": ["calendar", 27, "cal28"],
    "#modern-cal-29": ["calendar", 28, "cal29"],
    "#modern-cal-30": ["calendar", 29, "cal30"],
};

function updateOutput() {
    clearInterval(rainbowInterval);
    warnings = [];
    errors = [];
    theme = new SchoologyTheme(
        themeName.value || "Untitled Theme",
        SchoologyTheme.CURRENT_VERSION,
        { hue: 210 }
    );

    // Name
    if (!theme.name) {
        errors.push("Theme must have a name");
    } else if (defaultThemes.includes(theme.name)) {
        errors.push(
            "Theme can't use the same name as a default theme. Please choose a different name."
        );
    } else if (theme.name != origThemeName && allThemes[theme.name]) {
        errors.push(
            `A theme with the name "${theme.name}" already exists. Delete that theme or choose a different name before saving.`
        );
    }

    // Color
    theme.color = new ThemeColor();
    if (themeColorHue.checked) {
        themeColorCustomWrapper.classList.add("hidden");
        themeHueWrapper.classList.remove("hidden");
        themeColorRainbowWrapper.classList.add("hidden");
        theme.color.hue = $(themeHue).slider("value");

        setCSSVariable("color-hue", theme.color.hue.toString());
        setCSSVariable("primary-color", "hsl(var(--color-hue), 50%, 50%)");
        setCSSVariable("background-color", "hsl(var(--color-hue), 60%, 30%)");
        setCSSVariable("hover-color", "hsl(var(--color-hue), 55%, 40%)");
        setCSSVariable("border-color", "hsl(var(--color-hue), 60%, 25%)");
        setCSSVariable("link-color", "hsl(var(--color-hue), 55%, 40%)");
    } else if (themeColorCustom.checked) {
        themeColorCustomWrapper.classList.remove("hidden");
        themeHueWrapper.classList.add("hidden");
        themeColorRainbowWrapper.classList.add("hidden");
        theme.color.custom = new CustomColorDefinition(
            $("#theme-primary-color").spectrum("get").toHexString(),
            $("#theme-secondary-color").spectrum("get").toHexString(),
            $("#theme-background-color").spectrum("get").toHexString(),
            $("#theme-border-color").spectrum("get").toHexString(),
            $("#theme-link-color").spectrum("get").toHexString()
        );
        setCSSVariable("primary-color", theme.color.custom.primary);
        setCSSVariable("background-color", theme.color.custom.background);
        setCSSVariable("hover-color", theme.color.custom.hover);
        setCSSVariable("border-color", theme.color.custom.border);
        setCSSVariable("link-color", theme.color.custom.link);
    } else if (themeColorRainbow.checked) {
        themeColorCustomWrapper.classList.add("hidden");
        themeHueWrapper.classList.add("hidden");
        themeColorRainbowWrapper.classList.remove("hidden");
        theme.color.rainbow = new RainbowColorDefinition(
            new RainbowColorComponentDefinition(),
            new RainbowColorComponentDefinition(),
            new RainbowColorComponentDefinition()
        );

        if (theme.color.rainbow.hue && colorRainbowHueAnimate.checked) {
            colorRainbowHueAnimateWrapper.classList.remove("hidden");
            document.querySelector<HTMLLabelElement>(
                "label[for=color-rainbow-hue-value]"
            )!.firstElementChild!.textContent = "Hue Offset";
            colorRainbowHueValue.classList.remove("hue-slider");
            theme.color.rainbow.hue.animate = new RainbowColorComponentAnimation(
                +colorRainbowHueSpeed.value,
                +$(colorRainbowHueValue).slider("value"),
                +$(colorRainbowHueRange).roundSlider("getValue").split(",")[0],
                +$(colorRainbowHueRange).roundSlider("getValue").split(",")[1],
                colorRainbowHueAlternate.checked
            );

            let steps = [];
            let max =
                theme.color.rainbow.hue.animate.min > theme.color.rainbow.hue.animate.max
                    ? theme.color.rainbow.hue.animate.max + 360
                    : theme.color.rainbow.hue.animate.max;
            for (let i = 0; i <= 1; i += 0.05) {
                steps.push(
                    `hsl(${theme.color.rainbow.hue.animate.min * (1 - i) + max * i}, 50%, 50%)`
                );
            }
            if (theme.color.rainbow.hue.animate.alternate) {
                steps.push(...steps.slice(0, steps.length - 1).reverse());
            }
            colorRainbowHuePreview.style.background = `linear-gradient(to right, ${steps.join()})`;
        } else {
            colorRainbowHueAnimateWrapper.classList.add("hidden");
            document.querySelector<HTMLLabelElement>(
                "label[for=color-rainbow-hue-value]"
            )!.firstElementChild!.textContent = "Hue Value";
            colorRainbowHueValue.classList.add("hue-slider");
            theme.color.rainbow.hue!.value = $(colorRainbowHueValue).slider("value");
        }

        if (theme.color.rainbow.saturation && colorRainbowSaturationAnimate.checked) {
            colorRainbowSaturationAnimateWrapper.classList.remove("hidden");
            document.querySelector<HTMLLabelElement>(
                "label[for=color-rainbow-saturation-value]"
            )!.firstElementChild!.textContent = "Saturation Offset";
            theme.color.rainbow.saturation.animate = new RainbowColorComponentAnimation(
                +colorRainbowSaturationSpeed.value,
                +colorRainbowSaturationValue.value,
                $(colorRainbowSaturationRange).slider("values")[0],
                $(colorRainbowSaturationRange).slider("values")[1],
                colorRainbowSaturationAlternate.checked
            );
        } else {
            colorRainbowSaturationAnimateWrapper.classList.add("hidden");
            document.querySelector<HTMLLabelElement>(
                "label[for=color-rainbow-saturation-value]"
            )!.firstElementChild!.textContent = "Saturation Value";
            theme.color.rainbow.saturation!.value = Number.parseFloat(
                colorRainbowSaturationValue.value
            );
        }

        if (colorRainbowLightnessAnimate.checked) {
            colorRainbowLightnessAnimateWrapper.classList.remove("hidden");
            document.querySelector<HTMLLabelElement>(
                "label[for=color-rainbow-lightness-value]"
            )!.firstElementChild!.textContent = "Lightness Offset";
            theme.color.rainbow.lightness!.animate = new RainbowColorComponentAnimation(
                +colorRainbowLightnessSpeed.value,
                +colorRainbowLightnessValue.value,
                $(colorRainbowLightnessRange).slider("values")[0],
                $(colorRainbowLightnessRange).slider("values")[1],
                colorRainbowLightnessAlternate.checked
            );
        } else {
            colorRainbowLightnessAnimateWrapper.classList.add("hidden");
            document.querySelector<HTMLLabelElement>(
                "label[for=color-rainbow-lightness-value]"
            )!.firstElementChild!.textContent = "Lightness Value";
            theme.color.rainbow.lightness!.value = Number.parseFloat(
                colorRainbowLightnessValue.value
            );
        }

        let f = generateRainbowFunction(theme);
        if (f) {
            f();
            rainbowInterval = setInterval(f, 100);
        }
    }

    if (modernEnable.checked) {
        document.documentElement.setAttribute("modern", "true");
        modernWrapper.classList.remove("hidden");
        theme.color.modern = new ModernColorDefinition();
        theme.color.modern.calendar = [];
        theme.color.modern.interface = new ModernInterfaceColorDefinition(
            "#00DEAD",
            "#00DEAD",
            "#00DEAD",
            "#00DEAD",
            "#00DEAD",
            "#00DEAD",
            "#00DEAD",
            "#00DEAD",
            "#00DEAD"
        );
        theme.color.modern.text = new ModernTextColorDefinition("#00DEAD", "#00DEAD", "#00DEAD");
        theme.color.modern.options = new ModernOptionsDefinition(5, 1, 5);
        theme.color.modern.dark = $("#modern-color-primary").spectrum("get").isDark();
        document.documentElement.setAttribute("dark", theme.color.modern.dark.toString());

        for (let id in modernColorMap) {
            let key = modernColorMap[id];
            // couldn't figure out how to make TypeScript happy here, did my best
            let modernKey = theme.color.modern[key[0]] as ModernInterfaceColorDefinition;
            modernKey[key[1] as keyof ModernInterfaceColorDefinition] = $(id)
                .spectrum("get")
                .toString();
            setCSSVariable(key[2], $(id).spectrum("get").toString());
        }

        theme.color.modern.options.borderSize = +modernBorderSizeValue.value;
        theme.color.modern.options.borderRadius = +modernBorderRadiusValue.value;
        theme.color.modern.options.padding = +modernPaddingValue.value;

        setCSSVariable("modern-border-size", `${modernBorderSizeValue.value}px`);
        setCSSVariable("modern-border-radius", `${modernBorderRadiusValue.value}px`);
        setCSSVariable("modern-padding", `${modernPaddingValue.value}px`);
    } else {
        document.documentElement.setAttribute("modern", "false");
        modernWrapper.classList.add("hidden");
    }

    // Logo
    themeLogoWrapper.classList.add("hidden");
    if (themeSchoologyPlusLogo.checked) {
        theme.logo = new ThemeLogo(undefined, "schoology_plus");
        setCSSVariable("background-url", `url(${schoologyPlusLogoImageUrl})`);
    } else if (themeSchoologyLogo.checked) {
        theme.logo = new ThemeLogo(undefined, "schoology_logo");
        setCSSVariable("background-url", `url(${schoologyLogoImageUrl})`);
    } else if (themeLAUSDLogo2022.checked) {
        theme.logo = new ThemeLogo(undefined, "lausd_2022");
        setCSSVariable("background-url", `url(${lausd2022ImageUrl})`);
    } else if (themeNewLAUSDLogo.checked) {
        theme.logo = new ThemeLogo(undefined, "lausd_2019");
        setCSSVariable("background-url", `url(${lausd2019ImageUrl})`);
    } else if (themeLAUSDLogo.checked) {
        theme.logo = new ThemeLogo(undefined, "lausd_legacy");
        setCSSVariable("background-url", `url(${lausdLegacyImageUrl})`);
    } else if (themeDefaultLogo.checked) {
        theme.logo = new ThemeLogo(undefined, "default");
        setCSSVariable("background-url", `url(${placeholderUrl})`);
    } else if (themeCustomLogo.checked) {
        themeLogoWrapper.classList.remove("hidden");
        if (themeLogo.value) {
            theme.logo = new ThemeLogo(themeLogo.value);
            checkImage(
                themeLogo.value,
                x => {
                    let img = x.target as HTMLImageElement;
                    if (img.width != 160 || img.height < 36 || img.height > 60) {
                        warnings.push(
                            "Logo image is not between the recommended sizes of 160x36 and 160x60"
                        );
                    }
                    setCSSVariable("background-url", `url(${themeLogo.value})`);
                },
                () => errors.push("Logo URL does not point to a valid image")
            );
        } else {
            errors.push("No logo URL is specified");
        }
    }

    // Cursor
    if (themeCursor.value) {
        theme.cursor = new ThemeCursor(themeCursor.value);
        checkImage(
            themeCursor.value,
            x => {
                let img = x.target as HTMLImageElement;
                if (img.width > 128 || img.height > 128) {
                    errors.push("Cursor images must be smaller than 128x128 to appear");
                }
                setCSSVariable("cursor", `url(${themeCursor.value}), auto`);
            },
            () => errors.push("Cursor URL does not point to a valid image")
        );
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
            checkImage(url, undefined, () =>
                errors.push(url + " is not a valid image URL (Course Icons)")
            );
            try {
                RegExp(pattern);
            } catch {
                errors.push(pattern + " is not a valid regular expression (Course Icons)");
            }
            customIcons.push(new ThemeIcon(pattern, url));
        }
        theme.icons = customIcons;
    }

    updatePreview();
}

/**
 * Update the theme preview and optionally the theme JSON
 * @param {boolean} updateJSON Whether or not to replace the JSON output with form values
 */
function updatePreview(updateJSON: boolean = true) {
    if (updateJSON) output.value = JSON.stringify(theme, null, 4);
    let warningCard = document.getElementById("warning-card") as HTMLElement;
    if (warnings.length > 0) {
        warningCard.style.display = "block";
        document.getElementById("warning-content")!.innerHTML = warnings.join("<br/>");
    } else {
        warningCard.style.display = "none";
    }
    let errorCard = document.getElementById("error-card") as HTMLElement;
    if (errors.length > 0 && inEditMode()) {
        errorCard.style.display = "block";
        document.getElementById("error-content")!.innerHTML = errors.join("<br/>");
    } else {
        errorCard.style.display = "none";
    }
    M.updateTextFields();
    M.textareaAutoResize(output);
    iconPreview();
}

function trySaveTheme(apply = false) {
    try {
        saveTheme(apply);
    } catch (err) {
        alert(err);
    }
}

/**
 * Saves the theme currently displayed in the preview with the given name.
 * If the querystring parameter `theme` exists, it will rename the theme with that value
 * @param {boolean} [apply=false] If true, applies the theme and returns to defaultDomain
 */
function saveTheme(apply = false, imported = false) {
    if (errors.length > 0)
        throw new Error("Please fix all errors before saving the theme:\n" + errors.join("\n"));
    let t = JSON.parse(output.value);
    if (origThemeName && t.name != origThemeName) {
        ConfirmModal.open(
            "Rename Theme?",
            `Are you sure you want to rename "${origThemeName}" to "${t.name}"?`,
            ["Rename", "Cancel"],
            b => b === "Rename" && doSave(t)
        );
    } else {
        trackEvent("perform_action", {
            id: "color_type",
            context: "New Theme Created",
            value: Object.keys(t.color).find(k => k !== "modern"),
            legacyTarget: "color_type",
            legacyAction: Object.keys(t.color).find(k => k !== "modern"),
            legacyLabel: "New Theme Created",
        });

        trackEvent("perform_action", {
            id: "logo_type",
            context: "New Theme Created",
            value: t.logo.preset || "custom",
            legacyTarget: "logo_type",
            legacyAction: t.logo.preset || "custom",
            legacyLabel: "New Theme Created",
        });

        trackEvent("perform_action", {
            id: "cursor_type",
            context: "New Theme Created",
            value: t.cursor ? "primary" : "none",
            legacyTarget: "cursor_type",
            legacyAction: t.cursor ? "primary" : "none",
            legacyLabel: "New Theme Created",
        });

        trackEvent("perform_action", {
            id: "modern_enabled",
            context: "New Theme Created",
            value: String(!!t.color.modern),
            legacyTarget: "modern_enabled",
            legacyAction: String(!!t.color.modern),
            legacyLabel: "New Theme Created",
        });

        trackEvent("perform_action", {
            id: "preset",
            context: "New Theme Created",
            value: imported ? "Imported" : lastSelectedTemplate ?? undefined,
            legacyTarget: "preset",
            legacyAction: imported ? "Imported" : lastSelectedTemplate ?? undefined,
            legacyLabel: "New Theme Created",
        });

        doSave(t);
    }

    async function doSave(t: SchoologyThemeV2) {
        try {
            let s = await chrome.storage.sync.get({ themes: [] });
            let themes: SchoologyThemeV2[] = s.themes.filter(
                (x: SchoologyThemeV2) => x.name != (origThemeName || t.name)
            );
            themes.push(t);
            await chrome.storage.sync.set({ themes: themes });

            handleError();

            ConfirmModal.open("Theme saved successfully", "", ["OK"], () => {
                origThemeName = t.name;
                if (apply)
                    chrome.storage.sync.set(
                        { theme: t.name },
                        () => (location.href = `https://${defaultDomain}`)
                    );
                else location.reload();
            });
        } catch (e) {
            handleError();
        }

        function handleError() {
            if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message?.includes("QUOTA_BYTES_PER_ITEM")) {
                    alert(
                        "No space remaining to save theme. Please delete another theme or make this theme smaller in order to save. Most commonly themes are too large if they have too many custom icons."
                    );
                    throw new Error(
                        "No space remaining to save theme. Please delete another theme or make this theme smaller in order to save. Most commonly themes are too large if they have too many custom icons."
                    );
                }
            }
        }
    }
}

/**
 * Returns a valid CSS color string if input is valid, else returns an empty string
 * @param {string} c A possibly valid CSS color string
 * @returns {string} A valid CSS color string or `""` if input was invalid
 */
function validateColor(c: string) {
    var ele = document.createElement("div");
    ele.style.color = c;
    return ele.style.color.split(/\s+/).join("").toLowerCase();
}

/**
 * Checks if a URL points to a valid image
 * @param {string} imageSrc An image URL
 * @param {(Event)} validCallback Callback if image is valid
 * @param {(ErrorEvent)} invalidCallback Callback if image is invalid
 */
function checkImage(
    imageSrc: string,
    validCallback?: (e: Event) => void,
    invalidCallback?: (e?: string | Event) => void
) {
    try {
        var img = new Image();
        if (validCallback) img.onload = validCallback;
        if (invalidCallback) img.onerror = invalidCallback;
        img.src = imageSrc;
    } catch {
        invalidCallback?.();
    }
}

/**
 * Checks if a string is a valid JSON object
 * @param {string} str A JSON string
 * @returns {{}|boolean} The object if it is valid JSON, else false
 */
function parseJSONObject(str: string): Object | false {
    var isObject = (val: any): val is Object => (val instanceof Object ? true : false);
    try {
        let o = JSON.parse(str);
        return isObject(o) ? o : false;
    } catch (e) {
        return false;
    }
}

/**
 * Applies the theme with the given name
 * @param {string} t The theme's name
 */
function applyTheme(t: string) {
    importAndRender(allThemes[t]);
}

/**
 * Deletes a theme with the given name from the Chrome Sync Storage
 * @param {string} name The theme's name
 */
function deleteTheme(name: string) {
    ConfirmModal.open(
        "Delete Theme?",
        `Are you sure you want to delete the theme "${name}"?\nThe page will reload when the theme is deleted.`,
        ["Delete", "Cancel"],
        async b => {
            if (b === "Delete") {
                trackEvent("button_click", {
                    id: "delete-theme",
                    context: "Theme List",
                    value: name,
                    legacyTarget: `Theme: ${name}`,
                    legacyAction: "delete",
                    legacyLabel: "Theme List",
                });

                let s = await chrome.storage.sync.get(["theme", "themes"]);
                await chrome.storage.sync.set({
                    theme: s.theme == name ? null : s.theme,
                    themes: s.themes.filter((x: SchoologyThemeV2) => x.name != name),
                });
                window.location.reload();
            }
        }
    );
}

/**
 * Opens the editor interface with the given theme selected, or
 * none selected if name not provided
 * @param {string} [name] The theme to edit
 */
function editTheme(name: string, replaceName?: string) {
    if (replaceName) {
        lastSelectedTemplate = name;
    }
    trackEvent("button_click", {
        id: "edit-theme",
        context: "Theme List",
        value: name,
        legacyTarget: `Theme: ${name}`,
        legacyAction: "edit",
        legacyLabel: "Theme List",
    });
    clearInterval(rainbowInterval);
    themesListSection.classList.add("hidden");
    themeEditorSection.classList.remove("hidden");
    let themeToLoad = name ? allThemes[name] : { name: "My Theme", hue: 210 };
    if (replaceName) {
        themeToLoad.name = replaceName;
    }
    importAndRender(themeToLoad);
    previewSection.classList.add("show-editor-controls");
    output.removeAttribute("readonly");
    Array.from(iconList.querySelectorAll(".class-name, .icon-url")).map(x =>
        x.setAttribute("contenteditable", "true")
    );
    origThemeName = replaceName || name;
    document.querySelector("#json-output + label")!.textContent = "JSON (Paste to import a theme)";
}

/**
 * Opens a modal allowing user to paste a JSON theme string
 * and then saves the provided theme
 */
function importTheme() {
    PromptModal.open(
        "Import Theme",
        "Paste theme JSON here",
        ["Import", "Cancel"],
        (button, text) => {
            if (button === "Import") {
                try {
                    let j = JSON.parse(text);
                    importAndRender(j);
                    saveTheme(false, true);
                } catch {
                    ConfirmModal.open(
                        "Error Importing Theme",
                        errors.length > 0 ? errors.join() : "Please provide a valid JSON string",
                        ["OK"]
                    );
                }
            }
        }
    );
}

/**
 * Cycles the color of the interface
 */
function generateRainbowFunction(theme: SchoologyTheme) {
    if (theme.color.rainbow) {
        return () => {
            let hue = 0;
            let saturation = 0;
            let lightness = 0;
            let time = new Date().valueOf();

            // Equation for time-based hue, saturation, lightness:
            // hue = (((time / (150 - speed)) + offset) % (alternate ? range * 2 : range)) + min
            // if alternate and hue > max: hue = max - (hue - max)

            if (theme.color.rainbow?.hue?.animate) {
                let o = theme.color.rainbow.hue.animate;

                if (o.max < o.min) {
                    o.max += 360;
                }

                hue = getComponentValue(o, time);
            } else {
                hue = theme.color.rainbow?.hue?.value ?? 210;
            }
            if (theme.color.rainbow?.saturation?.animate) {
                saturation = getComponentValue(theme.color.rainbow.saturation.animate, time);
            } else {
                saturation = theme.color.rainbow?.saturation?.value ?? 100;
            }
            if (theme.color.rainbow?.lightness?.animate) {
                lightness = getComponentValue(theme.color.rainbow.lightness.animate, time);
            } else {
                lightness = theme.color.rainbow?.lightness?.value ?? 100;
            }

            document.documentElement.style.setProperty("--color-hue", hue.toString());
            setCSSVariable("primary-color", `hsl(var(--color-hue), ${saturation}%, ${lightness}%)`);
            setCSSVariable("background-color", "hsl(var(--color-hue), 60%, 30%)");
            setCSSVariable("hover-color", "hsl(var(--color-hue), 55%, 40%)");
            setCSSVariable("border-color", "hsl(var(--color-hue), 60%, 25%)");
            setCSSVariable("link-color", "hsl(var(--color-hue), 55%, 40%)");
        };
    }
    return undefined;

    function getComponentValue(animateObject: RainbowColorComponentAnimation, time: number) {
        let { speed, offset, alternate, min, max } = animateObject;
        let range = max - min;
        let v = ((time / (150 - speed) + +offset) % (alternate ? range * 2 : range)) + min;
        if (alternate && v > max) {
            v = max - (v - max);
        }
        return v;
    }
}

function addIcon() {
    trackEvent("button_click", {
        id: "add-theme-icon",
        context: "Theme Editor",
        legacyTarget: "new-icon",
        legacyAction: "click",
        legacyLabel: "Theme Editor",
    });
    let template = `<td style=text-align:center><a class="action-button tooltipped arrow-button move-down"data-tooltip="Move Down"><i class=material-icons>arrow_downward</i> </a><a class="action-button tooltipped arrow-button move-up"data-tooltip="Move Up"><i class=material-icons>arrow_upward</i></a><td class=class-name data-text="Class Name Pattern"><td class=icon-url data-text="Icon URL or paste/drop image"><td><img class="small-icon-preview" height=32/></td><td><a class="action-button tooltipped btn-flat delete-icon-button right waves-effect waves-light"data-tooltip=Delete><i class=material-icons>delete</i></a>`;
    let tr = document.createElement("tr");
    tr.innerHTML = template;
    iconList.appendChild(tr);
    let preview = tr.querySelector(".small-icon-preview") as HTMLImageElement;
    tr.querySelector(".move-down")?.addEventListener("click", moveDown);
    tr.querySelector(".move-up")?.addEventListener("click", moveUp);
    tr.querySelector(".delete-icon-button")?.addEventListener("click", deleteIcon);

    // Replaces pasted images with data urls
    tr.querySelector(".icon-url")?.addEventListener("paste", uploadAndPaste);

    initializeDragAndDrop(
        tr.querySelector<HTMLInputElement>(".icon-url")!,
        tr.querySelector(".small-icon-preview"),
        "textContent"
    );

    // Replaces pasted HTML with plain text
    tr.querySelector(".class-name")?.addEventListener("paste", plainTextPaste);

    tr.querySelector(".icon-url")?.addEventListener(
        "input",
        e => (preview.src = (e.target as HTMLElement).textContent!)
    );
    Array.from(tr.querySelectorAll("td")).map(x =>
        x.addEventListener("blur", e => ((e.target as HTMLElement).scrollLeft = 0))
    );
    M.Tooltip.init(tr.querySelectorAll(".tooltipped"), {
        outDuration: 0,
        inDuration: 300,
        enterDelay: 0,
        exitDelay: 10,
    });
    if (inEditMode()) {
        let arr = Array.from(tr.querySelectorAll(".class-name, .icon-url"));
        arr.map(x => x.setAttribute("contenteditable", "true"));
        arr.map(x => x.addEventListener("input", updateOutput));
    }
    return tr;
}

function uploadAndPaste(pasteEvent: Event | JQuery.Event) {
    let items = (
        (pasteEvent as ClipboardEvent).clipboardData ||
        ((pasteEvent as JQuery.Event).originalEvent as ClipboardEvent).clipboardData
    )?.items;
    let blob = null;
    for (let i of items ?? []) {
        if (i.type.indexOf("image") === 0) {
            blob = i.getAsFile();
        }
    }
    if (blob !== null) {
        pasteEvent.preventDefault();
        pasteEvent.stopPropagation();
        let pasteElement = pasteEvent.target as HTMLElement;
        var reader = new FileReader();
        reader.onload = function (e) {
            let text = (e.target as FileReader).result;
            pasteElement.dataset.originalText = pasteElement.dataset.text;
            pasteElement.dataset.text = "Uploading...";
            let t = M.toast({ html: `Uploading image...`, displayLength: Number.MAX_SAFE_INTEGER });
            imgurUpload(
                text?.toString(),
                result => {
                    t.dismiss();
                    let link = result.data.link;
                    if (document.queryCommandSupported("insertText")) {
                        document.execCommand("insertText", false, link);
                    } else {
                        document.execCommand("paste", false, link);
                    }
                    trackEvent("perform_action", {
                        id: "paste",
                        context: "Theme Editor",
                        value: "icon-image",
                        legacyTarget: "icon-image",
                        legacyAction: "paste",
                        legacyLabel: "Theme Editor",
                    });
                    // preview.src = link;
                    pasteElement.dataset.text = pasteElement.dataset.originalText;
                    pasteElement.dataset.originalText = "";
                    updateOutput();
                },
                error => {
                    t.dismiss();
                    M.toast({
                        html: `Uploading image failed: ${error.message || error.toString()}`,
                    });
                    pasteElement.dataset.text = pasteElement.dataset.originalText;
                    pasteElement.dataset.originalText = "";
                }
            );
        };
        reader.readAsDataURL(blob);
    } else {
        plainTextPaste(pasteEvent);
    }
}

function plainTextPaste(e: Event | JQuery.Event) {
    e.preventDefault();
    var text: string | undefined = undefined;
    if (
        (e as ClipboardEvent).clipboardData ||
        ((e as JQuery.Event).originalEvent as ClipboardEvent).clipboardData
    ) {
        text = (((e as JQuery.Event).originalEvent || e) as ClipboardEvent).clipboardData?.getData(
            "text/plain"
        );
    }
    if (document.queryCommandSupported("insertText")) {
        document.execCommand("insertText", false, text);
    } else {
        document.execCommand("paste", false, text);
    }
}

function moveUp(e: Event) {
    let target: HTMLElement | null = e.target as HTMLElement;
    while (target?.tagName != "TR") target = target?.parentElement ?? null;
    if (target.previousElementSibling) {
        target?.parentNode?.insertBefore(target, target.previousElementSibling);
    }
    updateOutput();
}

function moveDown(e: Event) {
    let target: HTMLElement | null = e.target as HTMLElement;
    while (target?.tagName != "TR") target = target?.parentElement ?? null;
    if (target.nextElementSibling) {
        target?.parentNode?.insertBefore(target.nextElementSibling, target);
    }
    updateOutput();
}

function deleteIcon(e: Event) {
    trackEvent("button_click", {
        id: "delete-theme-icon",
        context: "Theme Editor",
        legacyTarget: "delete-icon-button",
        legacyAction: "click",
        legacyLabel: "Theme Editor",
    });
    let target: HTMLElement | null = e.target as HTMLElement;
    while (target?.tagName != "TR") target = target?.parentElement ?? null;
    M.Tooltip.getInstance(target.querySelector(".delete-icon-button")!).destroy();
    target.outerHTML = "";
    updateOutput();
}

function iconPreview() {
    testIcon.src = (s => {
        if (!s) {
            return chrome.runtime.getURL("imgs/fallback-course-icon.svg");
        }

        s += " ";

        if (theme && theme.icons) {
            for (let iconPattern of theme.icons) {
                if (s.match(new RegExp(iconPattern.regex, "i"))) {
                    return iconPattern.url;
                }
            }
        }

        if (isLAUSD() || __storage.useDefaultIconSet === "enabled") {
            for (let iconPattern of DEFAULT_ICONS) {
                if (s.match(new RegExp(iconPattern.regex, "i"))) {
                    return iconPattern.url;
                }
            }
        }

        return chrome.runtime.getURL("imgs/fallback-course-icon.svg");
    })(iconTestText.value);
}

function copyThemeToClipboard(themeName: string) {
    trackEvent("button_click", {
        id: "copy-theme",
        context: "Theme List",
        value: themeName,
        legacyTarget: `Theme: ${themeName}`,
        legacyAction: "copy",
        legacyLabel: "Theme List",
    });
    let text = JSON.stringify(allThemes[themeName]);
    var copyFrom = $("<textarea/>");
    copyFrom.text(text);
    $("body").append(copyFrom);
    copyFrom.select();
    document.execCommand("copy");
    copyFrom.remove();
    M.toast({ html: `Copied theme "${themeName}" to clipboard` });
}

function inEditMode() {
    return !!document.querySelector(".show-editor-controls");
}

function preventDefaults(e: Event) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(region: HTMLElement) {
    if (!region.classList.contains("highlight")) {
        region.classList.add("highlight");
        region.dataset.originalText = region.dataset.text;
        region.dataset.text = "Drop to Use Image";
    }
}

function unhighlight(region: HTMLElement) {
    if (region.classList.contains("highlight")) {
        region.classList.remove("highlight");
        region.dataset.text = region.dataset.originalText;
        region.dataset.originalText = "";
    }
}

function handleDrop(
    e: DragEvent,
    region: HTMLInputElement,
    preview: HTMLImageElement | null,
    property: "value" | "textContent"
) {
    try {
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            let file = e.dataTransfer.files[0];
            let reader = new FileReader();
            reader.onloadend = () => {
                region.dataset.originalText = region.dataset.text;
                region.dataset.text = "Uploading...";
                let t = M.toast({
                    html: `Uploading image...`,
                    displayLength: Number.MAX_SAFE_INTEGER,
                });

                imgurUpload(
                    reader.result?.toString(),
                    result => {
                        success(result.data.link, t);
                    },
                    error => {
                        t.dismiss();
                        M.toast({
                            html: `Uploading image failed: ${error.message || error.toString()}`,
                        });
                        region.dataset.text = region.dataset.originalText;
                        region.dataset.originalText = "";
                    }
                );
            };
            reader.readAsDataURL(file);
        } else if (e.dataTransfer && e.dataTransfer.items.length >= 3) {
            e.dataTransfer.items[2].getAsString(s => {
                let img = htmlToElement<HTMLImageElement>(s);
                success(img.src);
            });
        }
    } catch (err) {
        M.toast({ html: `Error: Invalid image file` });
        Logger.error(err);
    }

    function success(link: string, toast?: M.Toast) {
        trackEvent("perform_action", {
            id: "drop",
            context: "Theme Editor",
            value: "icon-image",
            legacyTarget: "icon-image",
            legacyAction: "drop",
            legacyLabel: "Theme Editor",
        });
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

function htmlToElement<T extends HTMLElement = HTMLElement>(html: string): T {
    var template = document.createElement("template");
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild as T;
}

function imgurUpload(
    base64: string | null | undefined,
    callback: (json: any) => void,
    errorCallback: (err: any) => void
) {
    if (!base64) {
        errorCallback(new Error("Invalid URL"));
        return;
    }

    if (!localStorage.getItem("imgurPromptViewed")) {
        ConfirmModal.open(
            "Imgur Upload Consent",
            "By clicking 'agree', you consent to have the image you just dropped or pasted uploaded to Imgur. Click cancel to prevent the upload. If you click 'agree' this message will not be shown again.",
            ["Agree", "Cancel"],
            b => {
                if (b === "Agree") {
                    localStorage.setItem("imgurPromptViewed", "true");
                    doUpload();
                } else {
                    errorCallback(new Error("User did not give consent to upload"));
                }
            }
        );
    } else {
        doUpload();
    }

    function doUpload() {
        const CLIENT_ID = "56755c36eb5772d";
        fetch("https://api.imgur.com/3/image", {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Client-ID ${CLIENT_ID}`,
            },
            body: JSON.stringify({
                type: "base64",
                image: base64!.split(",")[1],
            }),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response;
            })
            .then(x => x.json())
            .then(callback)
            .catch(err => {
                Logger.log(err);
                errorCallback(err);
            });
    }
}

function initializeDragAndDrop(
    region: HTMLInputElement,
    preview: HTMLImageElement | null,
    property: "value" | "textContent"
) {
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        region.addEventListener(eventName, preventDefaults, false);
    });
    ["dragenter", "dragover"].forEach(eventName => {
        region.addEventListener(eventName, e => highlight(region), false);
    });
    region.addEventListener("dragleave", e => unhighlight(region), false);
    region.addEventListener(
        "drop",
        e => {
            unhighlight(region);
            handleDrop(e, region, preview, property);
        },
        false
    );
}

function hueSliderEvent(event: JQuery.Event | Event, ui: JQueryUI.SliderUIParams) {
    if ((event as JQuery.Event).originalEvent) {
        updateOutput();
        document.getElementById((event.target as HTMLElement).dataset.display!)!.textContent =
            ui.value?.toString() ?? "<ERR>";
    }
}

function rangeSliderEvent(event: JQuery.Event | Event, ui: JQueryUI.SliderUIParams) {
    if ((event as JQuery.Event).originalEvent) {
        document.getElementById(
            (event.target as HTMLElement).id + "-display"
        )!.textContent = `${ui.values?.[0]} - ${ui.values?.[1]}`;
        updateOutput();
    }
}

function circleRangeSliderEvent() {
    updateOutput();
}
