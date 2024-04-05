import { trackEvent } from "./analytics.js";
import { createButton, createElement, getBrowser } from "./dom.js";
import {
    BETA_TESTS,
    Setting,
    generateDebugInfo,
    getModalContents,
    updateSettings,
} from "./settings.js";
import Theme from "./theme";

const verboseModalFooterText = `&copy; Schoology Plus Contributors 2017-2023 | <a id="open-webstore" class="splus-track-clicks" href="https://schoologypl.us/?utm_source=ext-splus-settings-footer">Schoology Plus v${
    chrome.runtime.getManifest().version_name || chrome.runtime.getManifest().version
}${
    getBrowser() != "Chrome" || (chrome.runtime.getManifest() as any).update_url ? "" : " dev"
}</a> | <a href="https://discord.schoologypl.us" id="open-discord" class="splus-track-clicks" title="Get support, report bugs, suggest features, and chat with the Schoology Plus community">Discord Server</a> | <a href="https://github.com/aopell/SchoologyPlus" id="open-github" class="splus-track-clicks">GitHub</a> | <a href="#" id="open-contributors" class="splus-track-clicks">Contributors</a> | <a target="_blank" href="https://schoologypl.us/privacy" id="open-privacy-policy" class="splus-track-clicks">Privacy Policy</a> | <a href="#" id="open-changelog" class="splus-track-clicks"> Changelog</a>`;
export const modalFooterText = "Schoology Plus &copy; Schoology Plus Contributors 2017-2023";

const changelogIFrame = document.createElement("iframe");
changelogIFrame.src = `https://schoologypl.us/changelog?version=${
    chrome.runtime.getManifest().version
}`;

export default class Modal {
    id: string;
    element: HTMLElement;
    body: HTMLElement;
    onopen?: (modal: Modal, options?: any) => void;

    constructor(
        id: string,
        title: string,
        contentElement: HTMLElement,
        footerHTML: string,
        openCallback?: (modal: Modal, options: any) => void
    ) {
        let modalHTML =
            `<div id="${id}" class="splus-modal"><div class="splus-modal-content"><div class="splus-modal-header"><span class="close" data-parent="${id}">&times;</span>` +
            `<p class="splus-modal-title">${title}</p></div><div class="splus-modal-body"></div><div class="splus-modal-footer"><p class="splus-modal-footer-text">` +
            `${footerHTML}</p></div></div></div>`;

        document.body.appendChild(document.createElement("div")).innerHTML = modalHTML;

        this.id = id;
        this.element = document.getElementById(id)!;
        this.body = this.element.querySelector(".splus-modal-body")!;
        this.onopen = openCallback;

        this.body.appendChild(contentElement);
    }

    static openModal(id: string, options?: any) {
        Modal.closeAllModals();

        trackEvent("perform_action", {
            id: "open",
            context: "Modal",
            value: id,
            legacyTarget: id,
            legacyAction: "open",
            legacyLabel: "Modal",
        });

        let mm = Modal.modals.find(m => m.id == id);
        if (mm) {
            if (mm.onopen) mm.onopen(mm, options);
            mm.element.style.display = "block";
            document.documentElement.classList.add("splus-modal-open");
        }
    }

    static closeAllModals() {
        for (let m of Modal.modals) {
            Modal.modalClose(m.element);
        }
    }

    private static modalClose(element: HTMLElement) {
        if (
            element.id === "settings-modal" &&
            element.style.display !== "none" &&
            Setting.anyModified()
        ) {
            if (!confirm("You have unsaved settings.\nAre you sure you want to exit?")) return;
            updateSettings();
        } else if (
            element.id === "choose-theme-modal" &&
            element.style.display === "block" &&
            !localStorage.getItem("splus-temp-theme-chosen")
        ) {
            alert("Please use the 'Select' button to confirm your choice.");
            return;
        }

        element.style.display = "none";
        document.documentElement.classList.remove("splus-modal-open");
    }

    static modals: Modal[] = [
        new Modal(
            "settings-modal",
            "Schoology Plus Settings",
            getModalContents(),
            verboseModalFooterText,
            openOptionsMenu
        ),
        new Modal(
            "changelog-modal",
            "Schoology Plus Changelog",
            createElement("div", ["splus-modal-contents"], {}, [changelogIFrame]),
            modalFooterText
        ),
        new Modal(
            "analytics-modal",
            "Schoology Plus",
            createElement("div", ["splus-modal-contents"], {}, [
                createElement("h2", ["setting-entry"], {
                    textContent: "Anonymous Usage Statistics",
                }),
                createElement("p", ["setting-description"], { style: { fontSize: "14px" } }, [
                    createElement("span", [], {
                        textContent:
                            "Schoology Plus would like to collect anonymous usage statistics to better understand how people use this extension. Per our ",
                    }),
                    createElement("a", ["splus-track-clicks"], {
                        id: "analytics-privacy-policy-link",
                        href: "https://schoologypl.us/privacy",
                        textContent: "privacy policy",
                    }),
                    createElement("strong", [], {
                        textContent: " we don't collect ANY personal information.",
                    }),
                ]),
                createElement(
                    "p",
                    ["setting-description"],
                    { style: { fontSize: "14px", paddingTop: "10px", paddingBottom: "10px" } },
                    [
                        createElement("strong", [], {
                            textContent: "We encourage you to leave this enabled",
                        }),
                        createElement("span", [], {
                            textContent:
                                " so we can better understand how people use Schoology Plus, and we promise to be transparent about what we collect by providing aggregated statistics periodically in our ",
                        }),
                        createElement("a", [], {
                            href: "https://discord.schoologypl.us",
                            textContent: "Discord server.",
                        }),
                    ]
                ),
                new Setting(
                    "analytics",
                    "Anonymous Usage Statistics",
                    "[Reload required] Allow Schoology Plus to collect anonymous information about how you use the extension. We don't collect any personal information per our privacy policy.",
                    getBrowser() === "Firefox" ? "disabled" : "enabled",
                    "select",
                    {
                        options: [
                            {
                                text: "Enabled",
                                value: "enabled",
                            },
                            {
                                text: "Disabled",
                                value: "disabled",
                            },
                        ],
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                createElement("p", ["setting-description"], {
                    style: { fontSize: "14px", paddingTop: "10px" },
                    textContent:
                        "You can change your choice at any point in Schoology Plus settings",
                }),
                createElement("div", ["settings-buttons-wrapper"], undefined, [
                    createButton("save-analytics-settings", "Save and Close", () => {
                        Setting.saveModified();
                        Modal.closeAllModals();
                    }),
                ]),
            ]),
            modalFooterText
        ),
        new Modal(
            "beta-modal",
            "Schoology Plus βeta",
            createElement("div", ["splus-modal-contents"], {}, [
                createElement("h2", ["setting-entry"], { textContent: "Enable βeta Testing" }),
                createElement("p", ["setting-description"], { style: { fontSize: "14px" } }, [
                    createElement("span", [], {
                        textContent:
                            "If you have been given a Schoology Plus βeta code, you can enter it below to enable that beta test. If you don't know what this is, you should probably close this window, or you can ",
                    }),
                    createElement("a", ["splus-track-clicks"], {
                        id: "beta-discord-link",
                        href: "https://discord.schoologypl.us",
                        textContent: "join our Discord server",
                    }),
                    createElement("span", [], { textContent: " if you want to learn more." }),
                ]),
                createElement(
                    "p",
                    ["setting-description"],
                    { style: { fontSize: "14px", paddingTop: "10px", paddingBottom: "10px" } },
                    [
                        createElement("strong", [], { textContent: "You must" }),
                        createElement("span", [], {
                            textContent:
                                " have anonymous usage statistics enabled in order to participate in beta tests",
                        }),
                    ]
                ),
                new Setting(
                    "beta",
                    "Schoology Plus βeta Code",
                    "[Reload required] Enables a beta test of a new Schoology Plus feature if you enter a valid code",
                    "",
                    "text",
                    {
                        enabled: Setting.getValue("analytics") === "enabled",
                    },
                    value => value,
                    undefined,
                    element => element.value
                ).control,
                createElement("p", ["setting-description"], {
                    style: { fontSize: "14px", paddingTop: "10px" },
                    textContent:
                        "You can change this setting at any point to disable or change the beta test. Access this page by pressing Alt+B (Option+B on Mac).",
                }),
                createElement("div", ["settings-buttons-wrapper"], undefined, [
                    createButton("save-beta-settings", "Save", () => {
                        let new_test = (
                            document.getElementById("setting-input-beta") as HTMLInputElement
                        ).value;
                        let test_link = BETA_TESTS[new_test];
                        let current_test = Setting.getValue("beta");

                        if (new_test === "" && current_test) {
                            if (
                                confirm(
                                    `Are you sure you want to disable the "${current_test}" beta test? This will reload the page.`
                                )
                            ) {
                                Setting.saveModified();
                                location.reload();
                            }
                        } else if (test_link) {
                            if (new_test === current_test) {
                                return;
                            } else if (current_test) {
                                if (
                                    !confirm(
                                        `Are you sure you want to disable the "${current_test}" beta test and enable the "${new_test}" beta test? This will reload the page and open a document with information about how the new test works.`
                                    )
                                ) {
                                    return;
                                }
                            } else {
                                if (
                                    !confirm(
                                        `Are you sure you want to enable the "${new_test}" beta test? This will reload the page and open a document with information about how the test works.`
                                    )
                                ) {
                                    return;
                                }
                            }
                            Setting.saveModified();
                            window.open(test_link, "_blank");
                            location.reload();
                        } else {
                            alert("The βeta Code you entered was invalid");
                        }
                    }),
                ]),
            ]),
            modalFooterText
        ),
        new Modal(
            "contributors-modal",
            "Schoology Plus Contributors",
            createElement("div", ["splus-modal-contents"], undefined, [
                createElement("h2", ["setting-entry"], { textContent: "Lead Developers" }),
                createElement("div", ["setting-entry"], {}, [
                    createElement("h3", ["setting-title"], {}, [
                        createElement("a", [], {
                            href: "https://github.com/aopell",
                            textContent: "Aaron Opell (@aopell)",
                        }),
                    ]),
                    createElement("p", ["setting-description"], {
                        textContent: "Extension creator; lead developer",
                    }),
                ]),
                createElement("div", ["setting-entry"], {}, [
                    createElement("h3", ["setting-title"], {}, [
                        createElement("a", [], {
                            href: "https://github.com/glen3b",
                            textContent: "Glen Husman (@glen3b)",
                        }),
                    ]),
                    createElement("p", ["setting-description"], { textContent: "Lead developer" }),
                ]),
                createElement("h2", ["setting-entry"], { textContent: "Code Contributions" }),
                createElement("div", ["setting-entry"], {}, [
                    createElement("ul", ["contributor-list"], {
                        style: { listStyle: "inside" },
                        innerHTML: (function (contribs) {
                            let retVal = "";
                            for (let i = 0; i < contribs.length; i++) {
                                if (contribs[i].url) {
                                    retVal += `<li><a href="${contribs[i].url}" title="${contribs[i].name}">${contribs[i].name}</a></li>`;
                                } else {
                                    retVal += `<li><span>${contribs[i].name}</span></li>`;
                                }
                            }
                            return retVal;
                        })([
                            {
                                name: "Alexander (@xd-arsenic)",
                                url: "https://github.com/xd-arsenic",
                            },
                            { name: "@Roguim", url: "https://github.com/Roguim" },
                            { name: "Peter Stenger (@reteps)", url: "https://github.com/reteps" },
                            {
                                name: "Eric Pedley (@EricPedley)",
                                url: "https://github.com/EricPedley",
                            },
                            { name: "@KTibow", url: "https://github.com/KTibow" },
                            { name: "@FenyLabs", url: "https://github.com/FenyLabs" },
                            { name: "@jetline0", url: "https://github.com/jetline0" },
                            { name: "@dsnsgithub", url: "https://github.com/dsnsgithub" },
                            { name: "@senoj26", url: "https://github.com/senoj26" },
                            { name: "@TheThonos", url: "https://github.com/TheThonos" },
                        ]),
                    }),
                ]),
                createElement("h2", ["setting-entry"], {
                    textContent: "Testing, Bug Reporting, and/or Discord Moderation",
                }),
                createElement("div", ["setting-entry"], {}, [
                    createElement("ul", ["contributor-list"], {
                        style: { listStyle: "inside" },
                        innerHTML: (function (contribs: { name: string; url?: string }[]) {
                            let retVal = "";
                            for (let i = 0; i < contribs.length; i++) {
                                if (contribs[i].url) {
                                    retVal += `<li><a href="${contribs[i].url}" title="${contribs[i].name}">${contribs[i].name}</a></li>`;
                                } else {
                                    retVal += `<li><span>${contribs[i].name}</span></li>`;
                                }
                            }
                            return retVal;
                        })([
                            { name: "atomicproton#4444" },
                            { name: "penguinee232#7792" },
                            { name: "Cody Lomeli" },
                            { name: "Lucienne Reyes" },
                            { name: "Airbus A330-200#0001" },
                            { name: "Ark#9999" },
                            { name: "ASAMU#1919" },
                            { name: "Blumiere#7442" },
                            { name: "Krishy Fishy#3333" },
                            { name: "meepypotato07#7816" },
                            { name: "phool#0200" },
                            { name: "RVxBot#7862" },
                            { name: "TechFun#9234" },
                        ]),
                    }),
                ]),
                createElement("h2", ["setting-entry"], { textContent: "Icons and Images" }),
                createElement("div", ["setting-entry"], {}, [
                    createElement("ul", ["contributor-list"], {
                        style: { listStyle: "inside" },
                        innerHTML: (function (contribs) {
                            let retVal = "";
                            for (let i = 0; i < contribs.length; i++) {
                                retVal += `<li><a href="https://www.flaticon.com/authors/${contribs[
                                    i
                                ]
                                    .replace(/[ _]/, "-")
                                    .toLowerCase()}" title="${contribs[i]}">${
                                    contribs[i]
                                }</a></li>`;
                            }
                            return retVal;
                        })([
                            "DinosoftLabs",
                            "Eucalyp",
                            "Flat Icons",
                            "Freepik",
                            "Maxim Basinski",
                            "Pixel Buddha",
                            "Smashicons",
                            "Twitter",
                            "Vectors Market",
                            "Vitaly Gorbachev",
                            "srip",
                            "surang",
                            "Pixelmeetup",
                            "photo3idea_studio",
                        ]),
                    }),
                ]),
                createElement("div", ["setting-entry"], {}, [
                    createElement("p", ["setting-description"], {}, [
                        createElement("span", [], {
                            textContent: "Many custom course icons (under ",
                        }),
                        createElement("a", [], {
                            href: "https://creativecommons.org/licenses/by/3.0/",
                            title: "Creative Commons BY 3.0",
                            target: "_blank",
                            textContent: "CC BY 3.0",
                        }),
                        createElement("span", [], { textContent: ") from " }),
                        createElement("a", [], {
                            href: "https://www.flaticon.com/",
                            title: "flaticon",
                            target: "_blank",
                            textContent: "flaticon.com",
                        }),
                        createElement("p", [], { textContent: "Bundled:" }),
                        createElement("div", ["splus-indent-1"], {
                            innerHTML:
                                '<ul style="list-style: inside;"><li>Exclamation mark (grades page modified indicator): By <a href="https://www.flaticon.com/authors/pixel-buddha" title="Pixel Buddha">Pixel Buddha</a> from <a href="https://www.flaticon.com/" title="Flaticon">flaticon.com</a> under <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC BY 3.0</a></li>' +
                                '<li>Bookshelf (default course icon): <i>Modified</i>. Original by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">flaticon.com</a> under <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC BY 3.0</a></li>' +
                                '<li>Pencil (grade edit icon): From <a href="http://www.iconninja.com/edit-draw-pencile-write-icon-899685" title="IconNinja">iconninja.com</a></li>' +
                                "</ul>",
                        }),
                    ]),
                ]),
                createElement("div", ["setting-entry"], {}, [
                    createElement("h2", ["setting-title"], {
                        textContent: "...and countless other people",
                    }),
                    createElement("p", ["setting-description"], {
                        textContent: "For various ideas and suggestions",
                    }),
                ]),
                createElement("div", ["setting-entry"], {}, [
                    createElement("h2", ["setting-title"], {
                        textContent: "Would you like to contribute?",
                    }),
                    createElement("p", ["setting-description"], {
                        innerHTML:
                            'Please see our <a href="https://github.com/aopell/SchoologyPlus/blob/develop/CONTRIBUTING.md">contributing guidelines</a> for various ways you can help in the development of Schoology Plus. Thanks for your interest in contributing!',
                    }),
                ]),
                createElement("div", ["setting-entry"], {}, [
                    createElement("h3", ["setting-title"], { textContent: "Disclaimer" }),
                    createElement("p", ["setting-description"], {
                        textContent:
                            "Schoology Plus is not affiliated with Schoology Inc. or the Los Angeles Unified School District. Schoology, the SCHOOLOGY® wordmark, and the S logo are registered and unregistered trademarks of Schoology, Inc. in the United States. All product names, logos, and brands are property of their respective owners.",
                    }),
                ]),
            ]),
            modalFooterText
        ),
        new Modal(
            "choose-theme-modal",
            "Schoology Plus Themes",
            createElement("div", ["splus-modal-contents"], {}, [
                createElement("h2", ["setting-entry"], { textContent: "Choose a New Theme!" }),
                createElement("p", ["setting-description"], {
                    textContent:
                        "Schoology Plus has a bunch of new themes! Choose one from below, make your own, or keep your current theme. It's your choice! Click on each theme for a preview and then click the button to confirm your choice. You can change your theme at any time in Schoology Plus Settings.",
                    style: { fontSize: "14px", paddingBottom: "10px" },
                }),
                createElement(
                    "div",
                    ["splus-button-tile-container"],
                    {},
                    [
                        {
                            text: "Modern Dark Theme",
                            theme: "Schoology Plus Modern Dark",
                            new: true,
                        },
                        {
                            text: "Modern Light Theme",
                            theme: "Schoology Plus Modern Light",
                            new: true,
                        },
                        { text: "Modern Rainbow Theme", theme: "Rainbow Modern", new: true },
                        {
                            text: "Schoology Plus Classic Theme",
                            theme: "Schoology Plus",
                            active: Theme.active.name === "Schoology Plus",
                        },
                        {
                            text: `Keep Current Theme: ${Theme.active.name}`,
                            theme: Theme.active.name,
                            active: Theme.active.name !== "Schoology Plus",
                            hidden: Theme.active.name === "Schoology Plus",
                        },
                        {
                            text: "See More Themes or Make Your Own",
                            theme: Theme.active.name,
                            extraWide: Theme.active.name === "Schoology Plus",
                        },
                    ].map(obj => {
                        return createElement(
                            "div",
                            [
                                ...["splus-button-tile", "select-theme-tile"],
                                ...(obj.active ? ["active"] : []),
                            ],
                            {
                                style: {
                                    display: obj.hidden ? "none" : "flex",
                                    gridColumnEnd: obj.extraWide ? "span 2" : "unset",
                                },
                                dataset: { new: `${obj.new}` },
                                onclick: e => {
                                    let target = e.target as HTMLElement;
                                    for (let child of target.parentElement!.children) {
                                        child.classList.remove("active");
                                    }
                                    target.classList.add("active");

                                    trackEvent("button_click", {
                                        id: "preview-theme",
                                        context: "Choose Theme Popup",
                                        value: obj.text,
                                        legacyTarget: "selected tile",
                                        legacyAction: obj.text,
                                        legacyLabel: "Choose Theme Popup",
                                    });

                                    Theme.tempTheme = obj.theme;
                                    Theme.apply(Theme.byName(obj.theme));

                                    (
                                        document.getElementById(
                                            "theme-popup-select-button"
                                        ) as HTMLInputElement
                                    ).value = `Select ${obj.text}`;
                                },
                            },
                            [
                                createElement("span", ["splus-button-tile-content"], {
                                    textContent: obj.text,
                                }),
                            ]
                        );
                    })
                ),
                (() => {
                    let btn = createButton(
                        "theme-popup-select-button",
                        `Select Keep Current Theme: ${Theme.active.name}`,
                        e => {
                            localStorage.setItem("splus-temp-theme-chosen", "true");
                            let themeName = document.querySelector(
                                ".select-theme-tile.active .splus-button-tile-content"
                            )?.textContent;

                            trackEvent("button_click", {
                                id: "apply-theme",
                                context: "Choose Theme Popup",
                                value: themeName ?? undefined,
                                legacyTarget: "confirmed selection",
                                legacyAction: themeName ?? undefined,
                                legacyLabel: "Choose Theme Popup",
                            });

                            let chooseThemeModal = document.getElementById("choose-theme-modal")!;
                            Modal.closeAllModals();
                            Setting.setValue("theme", Theme.tempTheme);
                            if (
                                chooseThemeModal
                                    .querySelector(
                                        ".splus-button-tile-container .splus-button-tile:last-child"
                                    )!
                                    .classList.contains("active")
                            ) {
                                location.href = chrome.runtime.getURL("/theme-editor.html");
                            }
                        }
                    );
                    btn.style.float = "right";
                    btn.style.margin = "20px 20px 0";
                    return btn;
                })(),
            ]),
            modalFooterText
        ),
        new Modal(
            "debug-modal",
            "Debug Info",
            createElement("div", ["splus-modal-contents"], {}, [
                createElement("div", ["setting-entry"], {}, [
                    createButton("debug-modal-clipboard-copy", "Copy to Clipboard", event =>
                        navigator.clipboard.writeText(generateDebugInfo())
                    ),
                ]),
                createElement("pre", [], {
                    id: "debug-modal-content",
                    textContent: "Loading...",
                }),
            ]),
            modalFooterText,
            (modal, x) =>
                (document.getElementById("debug-modal-content")!.textContent = generateDebugInfo())
        ),
    ];
}

async function openOptionsMenu(settingsModal: Modal) {
    settingsModal.body.innerHTML = "";

    await updateSettings();

    settingsModal.body.appendChild(getModalContents());
    settingsModal.element
        .querySelector("#open-changelog")
        ?.addEventListener("click", () => Modal.openModal("changelog-modal"), { once: true });
    settingsModal.element
        .querySelector("#open-contributors")
        ?.addEventListener("click", () => Modal.openModal("contributors-modal"), { once: true });
    Setting.onShown();
    $(".splus-settings-tabs").tabs({
        active: 0,
        heightStyle: "fill",
    });
}
