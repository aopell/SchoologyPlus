// Inform user about theme
{
    if (localStorage["splus-temp-generatedtheme"]) {
        localStorage.removeItem("splus-temp-generatedtheme");

        showToast(
            "Theme Generated",
            "Schoology Plus created a theme that matches your school's theme",
            "rgb(0,255,0)",
            {
                buttons: [
                    createToastButton("View Themes", "view-themes-button", () => location.href = chrome.runtime.getURL("/theme-editor.html"))
                ]
            }
        );
    }
}

{
    let betaCode = Setting.getValue("beta");
    let betaSection = null;
    if (betaCode in beta_tests) {
        // Beta Enabled Notice
        let betaTag = createElement("span", ["splus-beta-tag", "splus-track-clicks"], { textContent: "β", id: "beta-tag" });
        betaTag.addEventListener("click", event => openModal("beta-modal"));
        let betaContainer = createElement("div", ["splus-beta-container"], {}, [betaTag]);
        document.body.append(betaContainer);
        betaSection = createBetaSection(betaCode);
        betaContainer.append(betaSection);
    }

    function createBetaSection(name) {
        return createElement("div", ["splus-beta-section"], { id: `splus-beta-section-${name}` }, [
            createElement("h3", [], { textContent: name })
        ]);
    }

    function createBetaToggleCheckbox(name, onchange, checked = false, nestingLevel = 1) {
        return createElement("div", ["splus-beta-toggle"], { style: { paddingLeft: `${(nestingLevel - 1) * 10}px` } }, [
            createElement("label", [], { textContent: name }),
            createElement("input", [], { type: "checkbox", checked: checked, onchange: onchange })
        ]);
    }

    // Dark Theme Beta
    if (betaCode == "darktheme") {
        let newThemeSheet = createElement("link", [], { rel: "stylesheet", href: chrome.runtime.getURL("/css/modern.css") });
        document.head.append(newThemeSheet);
        document.documentElement.setAttribute("test-mode", "crazy");

        var darkThemeTheme = Theme.loadFromObject({
            "color":
            {
                "custom":
                {
                    "background": "#36393f",
                    "border": "#40444b",
                    "hover": "#6fa8dc",
                    "primary": "#202225"
                }
            }, "logo":
            {
                "preset": "schoology_plus"
            },
            "name": "Dark Theme Test",
            "version": 2
        });

        Theme.apply(darkThemeTheme);

        betaSection.append(
            createBetaToggleCheckbox("Enable new theme engine", event => newThemeSheet.disabled = !event.target.checked, true),
            createBetaToggleCheckbox("Enable dark theme", event => {
                document.documentElement.setAttribute("dark", event.target.checked);
                Theme.apply(event.target.checked ? darkThemeTheme : Theme.byName(Setting.getValue("theme")));
            }, true),
            createBetaToggleCheckbox("Enable color test", event => document.documentElement.setAttribute("test", event.target.checked)),
            createBetaToggleCheckbox("Crazy mode", event => document.documentElement.setAttribute("test-mode", event.target.checked ? "crazy" : "standard"), true, 2)
        );
    }
}

// Check Schoology domain
{
    const BLACKLISTED_DOMAINS = ["asset-cdn.schoology.com", "developer.schoology.com", "support.schoology.com", "info.schoology.com", "files-cdn.schoology.com", "status.schoology.com", "ui.schoology.com", "www.schoology.com", "api.schoology.com", "developers.schoology.com", "schoology.com", "support.schoology.com", "error-page.schoology.com", "app-msft-teams.schoology.com"];
    let dd = Setting.getValue("defaultDomain");

    if (dd !== window.location.host && !BLACKLISTED_DOMAINS.includes(window.location.host) && !window.location.host.match(/.*[-\.]app\.schoology\.com/)) {
        Setting.setValue("defaultDomain", window.location.host);

        let bgColor = document.querySelector("#header header").style.backgroundColor;

        if (bgColor) {
            let t = {
                "name": `Auto Generated Theme for ${window.location.host}`,
                "version": 2,
                "color": {
                    "custom": {
                        "primary": bgColor,
                        "hover": "rgb(2, 79, 125)",
                        "background": "rgb(2, 79, 125)",
                        "border": "rgb(2, 79, 125)"
                    }
                },
                "logo": {
                    "preset": "default"
                }
            };

            localStorage["splus-temp-generatedtheme"] = true;

            chrome.storage.sync.get({ themes: [] }, s => {
                let themes = s.themes.filter(x => x.name !== `Auto Generated Theme for ${window.location.host}`);
                themes.push(t);
                chrome.storage.sync.set({ themes: themes }, () => {
                    Logger.log(`Schoology Plus has updated the domain on which it runs.\nPrevious: ${dd}\nNew: ${window.location.host}`);
                    location.reload();
                });
            });
        } else {
            Logger.log(`Schoology Plus has updated the domain on which it runs.\nPrevious: ${dd}\nNew: ${window.location.host}`);
            location.reload();
        }
    }
}

// Page Modifications

document.head.appendChild(createElement("meta", [], { name: "viewport", content: "width=device-width, initial-scale=1" }));
let bottom = document.querySelector("span.Footer-copyright-2Vt6I");
bottom.appendChild(createElement("span", ["footer-divider"], { textContent: "|" }, [
    createElement("span", ["footer-text-enhanced-by"], { textContent: "Enhanced by Schoology Plus" }),
]));

document.documentElement.style.setProperty("--default-visibility", "visible");

let verboseModalFooterText = `&copy; Aaron Opell, Glen Husman 2017-2020 | <a id="open-webstore" class="splus-track-clicks" href="https://schoologypl.us">Schoology Plus v${chrome.runtime.getManifest().version_name || chrome.runtime.getManifest().version}${getBrowser() != "Chrome" || chrome.runtime.getManifest().update_url ? '' : ' dev'}</a> | <a href="https://discord.schoologypl.us" id="open-discord" class="splus-track-clicks" title="Get support, report bugs, suggest features, and chat with the Schoology Plus community">Discord Server</a> | <a href="https://github.com/aopell/SchoologyPlus" id="open-github" class="splus-track-clicks">GitHub</a> | <a href="#" id="open-contributors" class="splus-track-clicks">Contributors</a> | <a target="_blank" href="https://schoologypl.us/privacy" id="open-privacy-policy" class="splus-track-clicks">Privacy Policy</a> | <a href="#" id="open-changelog" class="splus-track-clicks"> Changelog</a>`;
let modalFooterText = "Schoology Plus &copy; Aaron Opell, Glen Husman 2017-2020";

let frame = document.createElement("iframe");
frame.src = `https://schoologypl.us/changelog?version=${chrome.runtime.getManifest().version}`;

let modals = [
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
        createElement("div", ["splus-modal-contents"], {}, [frame]),
        modalFooterText
    ),
    new Modal(
        "analytics-modal",
        "Schoology Plus",
        createElement("div", ["splus-modal-contents"], {}, [
            createElement("h2", ["setting-entry"], { textContent: "Anonymous Usage Statistics" }),
            createElement("p", ["setting-description"], { style: { fontSize: "14px" } }, [
                createElement("span", [], { textContent: "Schoology Plus would like to collect anonymous usage statistics to better understand how people use this extension. Per our " }),
                createElement("a", ["splus-track-clicks"], { id: "analytics-privacy-policy-link", href: "https://schoologypl.us/privacy", textContent: "privacy policy" }),
                createElement("strong", [], { textContent: " we don't collect ANY personal information." }),
            ]),
            createElement("p", ["setting-description"], { style: { fontSize: "14px", paddingTop: "10px", paddingBottom: "10px" } }, [
                createElement("strong", [], { textContent: "We encourage you to leave this enabled" }),
                createElement("span", [], { textContent: " so we can better understand how people use Schoology Plus, and we promise to be transparent about what we collect by providing aggregated statistics periodically in our " }),
                createElement("a", [], { href: "https://discord.schoologypl.us", textContent: "Discord server." })
            ]),
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
                            value: "enabled"
                        },
                        {
                            text: "Disabled",
                            value: "disabled"
                        }
                    ]
                },
                value => value,
                undefined,
                element => element.value
            ).control,
            createElement("p", ["setting-description"], { style: { fontSize: "14px", paddingTop: "10px" }, textContent: "You can change your choice at any point in Schoology Plus settings" }),
            createElement("div", ["settings-buttons-wrapper"], undefined, [
                createButton("save-analytics-settings", "Save and Close", () => {
                    Setting.saveModified();
                    modalClose(document.getElementById("analytics-modal"));
                })
            ])
        ]),
        modalFooterText
    ),
    new Modal(
        "beta-modal",
        "Schoology Plus βeta",
        createElement("div", ["splus-modal-contents"], {}, [
            createElement("h2", ["setting-entry"], { textContent: "Enable βeta Testing" }),
            createElement("p", ["setting-description"], { style: { fontSize: "14px" } }, [
                createElement("span", [], { textContent: "If you have been given a Schoology Plus βeta code, you can enter it below to enable that beta test. If you don't know what this is, you should probably close this window, or you can " }),
                createElement("a", ["splus-track-clicks"], { id: "beta-discord-link", href: "https://discord.schoologypl.us", textContent: "join our Discord server" }),
                createElement("span", [], { textContent: " if you want to learn more." }),
            ]),
            createElement("p", ["setting-description"], { style: { fontSize: "14px", paddingTop: "10px", paddingBottom: "10px" } }, [
                createElement("strong", [], { textContent: "You must" }),
                createElement("span", [], { textContent: " have anonymous usage statistics enabled in order to participate in beta tests" })
            ]),
            new Setting(
                "beta",
                "Schoology Plus βeta Code",
                "[Reload required] Enables a beta test of a new Schoology Plus feature if you enter a valid code",
                "",
                "text",
                {
                    enabled: Setting.getValue("analytics") === "enabled"
                },
                value => value,
                undefined,
                element => element.value
            ).control,
            createElement("p", ["setting-description"], { style: { fontSize: "14px", paddingTop: "10px" }, textContent: "You can change this setting at any point to disable or change the beta test. Access this page by pressing Alt+B (Option+B on Mac)." }),
            createElement("div", ["settings-buttons-wrapper"], undefined, [
                createButton("save-beta-settings", "Save", () => {
                    let new_test = document.getElementById("setting-input-beta").value;
                    let test_link = beta_tests[new_test];
                    let current_test = Setting.getValue("beta");

                    if (new_test === "" && current_test) {
                        if (confirm(`Are you sure you want to disable the "${current_test}" beta test? This will reload the page.`)) {
                            Setting.saveModified();
                            location.reload();
                        }
                    } else if (test_link) {
                        if (new_test === current_test) {
                            return;
                        } else if (current_test) {
                            if (!confirm(`Are you sure you want to disable the "${current_test}" beta test and enable the "${new_test}" beta test? This will reload the page and open a document with information about how the new test works.`)) {
                                return;
                            }
                        } else {
                            if (!confirm(`Are you sure you want to enable the "${new_test}" beta test? This will reload the page and open a document with information about how the test works.`)) {
                                return;
                            }
                        }
                        Setting.saveModified();
                        window.open(test_link, "_blank");
                        location.reload();
                    } else {
                        alert("The βeta Code you entered was invalid");
                    }
                })
            ])
        ]),
        modalFooterText
    ),
    new Modal(
        "contributors-modal",
        "Schoology Plus Contributors",
        createElement("div", ["splus-modal-contents"], undefined, [
            createElement("h2", ["setting-entry"], { textContent: "Contributors" }),
            createElement("div", ["setting-entry"], {}, [
                createElement("h3", ["setting-title"], {}, [
                    createElement("a", [], { href: "https://github.com/aopell", textContent: "Aaron Opell (@aopell)" })
                ]),
                createElement("p", ["setting-description"], { textContent: "Extension creator; lead developer" })
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h3", ["setting-title"], {}, [
                    createElement("a", [], { href: "https://github.com/glen3b", textContent: "Glen Husman (@glen3b)" })
                ]),
                createElement("p", ["setting-description"], { textContent: "Lead developer" })
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h3", ["setting-title"], {}, [
                    createElement("a", [], { href: "https://github.com/Roguim", textContent: "@Roguim" }),
                    createElement("span", [], { textContent: ", " }),
                    createElement("a", [], { href: "https://github.com/reteps", textContent: "Peter Stenger (@reteps)" }),
                    createElement("span", [], { textContent: ", and " }),
                    createElement("a", [], { href: "https://github.com/xd-arsenic", textContent: "Alexander (@xd-arsenic)" })
                ]),
                createElement("p", ["setting-description"], { textContent: "Various code contributions" })
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h3", ["setting-title"], {}, [
                    // contributors list
                    createElement("span", [], {
                        innerHTML: (function (contribs) {
                            let retVal = "";
                            for (let i = 0; i < contribs.length; i++) {
                                retVal += `<a href="https://www.flaticon.com/authors/${contribs[i].replace(" ", "-").toLowerCase()}" title="${contribs[i]}">${contribs[i]}</a>`;
                                if (i == contribs.length - 2) {
                                    retVal += ", and ";
                                } else if (i != contribs.length - 1) {
                                    retVal += ", ";
                                }
                            }
                            return retVal;
                        })(["DinosoftLabs", "Eucalyp", "Flat Icons", "Freepik", "Maxim Basinski", "Pixel Buddha", "Smashicons", "Twitter", "Vectors Market", "Vitaly Gorbachev", "srip", "surang", "Pixelmeetup"])
                    }),
                    createElement("span", [], { textContent: " from " }),
                    createElement("a", [], { href: "https://www.flaticon.com/", textContent: "flaticon.com" })
                ]),
                createElement("p", ["setting-description"], {}, [
                    createElement("span", [], { textContent: "Many custom course icons (under " }),
                    createElement("a", [], { href: "http://creativecommons.org/licenses/by/3.0/", title: "Creative Commons BY 3.0", target: "_blank", textContent: "CC BY 3.0" }),
                    createElement("span", [], { textContent: ")" }),
                    createElement("p", [], { textContent: "Bundled:" }),
                    createElement("div", ["splus-indent-1"], {
                        innerHTML:
                            '<ul><li>Exclamation mark (grades page modified indicator): By <a href="https://www.flaticon.com/authors/pixel-buddha" title="Pixel Buddha">Pixel Buddha</a> from <a href="https://www.flaticon.com/" title="Flaticon">flaticon.com</a> under <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC BY 3.0</a></li>'
                            + '<li>Bookshelf (default course icon): <i>Modified</i>. Original by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">flaticon.com</a> under <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC BY 3.0</a></li>'
                            + "</ul>"
                    })
                ]),

                createElement("ul", ["setting-description"], {}, [
                    createElement("li", [], { textContent: "" })
                ])
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h3", ["setting-title"], {}, [
                    createElement("a", [], { href: "http://www.iconninja.com/edit-draw-pencile-write-icon-899685", textContent: "Pencil Icon from IconNinja" })
                ]),
                createElement("p", ["setting-description"], { textContent: "Bundled as edit grade icon" }, [])
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h3", ["setting-title"], { textContent: "...and more" }),
                createElement("p", ["setting-description"], { textContent: "For various ideas and suggestions" })
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h2", ["setting-title"], { textContent: "Would you like to contribute?" }),
                createElement("p", ["setting-description"], { innerHTML: 'Please see our <a href="https://github.com/aopell/SchoologyPlus/blob/develop/CONTRIBUTING.md">contributing guidelines</a> for various ways you can help in the development of Schoology Plus. Thanks for your interest in contributing!' })
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h3", ["setting-title"], { textContent: "Disclaimer" }),
                createElement("p", ["setting-description"], { textContent: "Schoology Plus is not affiliated with Schoology Inc. or the Los Angeles Unified School District. Schoology, the SCHOOLOGY® wordmark, and the S logo are registered and unregistered trademarks of Schoology, Inc. in the United States. All product names, logos, and brands are property of their respective owners." })
            ])
        ]),
        modalFooterText
    ),
];

(() => {
    // Run when new version installed
    let newVersion = Setting.getValue("newVersion");
    if (!newVersion || newVersion != chrome.runtime.getManifest().version) {
        let currentVersion = chrome.runtime.getManifest().version;

        iziToast.show({
            theme: 'dark',
            iconUrl: chrome.runtime.getURL("/imgs/plus-icon.png"),
            title: `Welcome to Schoology Plus version ${currentVersion}!`,
            position: 'topRight',
            timeout: 0,
            progressBarColor: 'hsl(190, 100%, 50%)',
            buttons: [
                ['<button>View Changelog</button>', function (instance, toast) {
                    instance.hide({
                        transitionOut: 'fadeOutRight',
                        onClosing: function (instance, toast, closedBy) {
                            trackEvent('viewChangelogButton', "click", "Toast Button");
                            openModal("changelog-modal");
                        }
                    }, toast, 'viewChangelogButton');
                }]
            ]
        });

        versionSpecificFirstLaunch(currentVersion, newVersion);
        Setting.setValue("newVersion", chrome.runtime.getManifest().version);
    }
})();

(async function () {
    Theme.profilePictureOverrides = [];
    let courseProfilePicOverrides = Setting.getValue("forceDefaultCourseIcons") || {};

    let profilePicLoadTasks = [];

    for (let courseId in courseProfilePicOverrides) {
        if (courseProfilePicOverrides[courseId] == "enabled") {
            profilePicLoadTasks.push(fetchApiJson("/sections/" + courseId));
        }
    }

    Logger.log("Forcing Schoology-default icons for " + profilePicLoadTasks.length + " courses");

    // from https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex/6969486#6969486
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    let overrides = await Promise.all(profilePicLoadTasks);
    for (let course of overrides) {
        Theme.profilePictureOverrides.push({ regex: escapeRegExp(course.course_title) + " ?: " + escapeRegExp(course.section_title), url: course.profile_url });
    }

    if (profilePicLoadTasks.length > 0) {
        Theme.setProfilePictures();
    }
})();

let video = document.body.appendChild(createElement("video", ["easter-egg"], {
    onended: function () {
        this.style.visibility = "hidden";
    }
}));

let source = createElement("source", [], {
    src: "https://gist.github.com/aopell/0fe2408cffbab2b6fadb18ebaa28808f/raw/77853f137329c042c34bdb5be38c1930357c0531/cut.webm",
    type: "video/webm"
});

let sourceSet = false;

document.body.onkeydown = (data) => {
    if (data.altKey && data.code === "KeyC") {
        if (!sourceSet) {
            video.appendChild(source);
            sourceSet = true;
        }
        video.style.visibility = "visible";
        video.currentTime = 0;
        video.play();
        trackEvent("Easter Egg", "play", "Easter Egg");
    } else if (data.altKey && data.code === "KeyB") {
        openModal("beta-modal");
    }
    else if (data.key === "Escape") {
        video.style.visibility = "hidden";
        video.pause();
    }
    data.preventDefault = false;
};

document.querySelector("#header > header > nav > ul:nth-child(2)").prepend(createElement("li", ["_24avl", "_3Rh90", "_349XD"], {}, [
    createElement(
        "button",
        ["_1SIMq", "_2kpZl", "_3OAXJ", "_13cCs", "_3_bfp", "_2M5aC", "_24avl", "_3v0y7", "_2s0LQ", "_3ghFm", "_3LeCL", "_31GLY", "_9GDcm", "_1D8fw", "util-height-six-3PHnk", "util-line-height-six-3lFgd", "util-text-decoration-none-1n0lI", "Header-header-button-active-state-3AvBm", "Header-header-button-1EE8Y", "sExtlink-processed"],
        { onclick: () => openModal("settings-modal") },
        [
            createSvgLogo("_3ESp2", "dlCBz", "_1I3mg", "fjQuT", "uQOmx")
        ]
    )
]));

for (let e of document.querySelectorAll(".close")) {
    e.onclick = modalClose;
}

window.onclick = function (event) {
    if (modals.find(x => x.element == event.target)) {
        modalClose(event.target);
    }
}

function openOptionsMenu(settingsModal) {
    settingsModal.body.innerHTML = "";
    updateSettings(() => {
        settingsModal.body.appendChild(getModalContents());
        settingsModal.element.querySelector("#open-changelog").addEventListener("click", () => openModal("changelog-modal"), { once: true });
        settingsModal.element.querySelector("#open-contributors").addEventListener("click", () => openModal("contributors-modal"), { once: true });
    });
}

/**
 * Opens the modal with the given ID
 * @param {string} id The ID of the modal to open
 * @param {Object} [options] An optional options argument to be passed to the modal's open event
 */
function openModal(id, options) {

    for (let m of modals) {
        modalClose(m.element);
    }

    trackEvent(id, "open", "Modal");

    let mm = modals.find(m => m.id == id);
    if (mm.onopen) mm.onopen(mm, options);
    mm.element.style.display = "block";
    document.documentElement.classList.add("splus-modal-open");
}

function modalClose(element) {
    element = element.target ? document.getElementById(element.target.dataset.parent) : element;

    if (element.id === "settings-modal" && element.style.display !== "none" && Setting.anyModified()) {
        if (!confirm("You have unsaved settings.\nAre you sure you want to exit?")) return;
        updateSettings();
    }

    element.style.display = "none";
    document.documentElement.classList.remove("splus-modal-open");
}

/**
 * Creates a Schoology Plus modal element
 * @param {string} id 
 * @param {string} title 
 * @param {HTMLElement} contentElement 
 * @param {string} footerHTML 
 * @param {(Modal,Object?)=>void} openCallback 
 */
function Modal(id, title, contentElement, footerHTML, openCallback) {
    let modalHTML = `<div id="${id}" class="splus-modal"><div class="splus-modal-content"><div class="splus-modal-header"><span class="close" data-parent="${id}">&times;</span>`
        + `<p class="splus-modal-title">${title}</p></div><div class="splus-modal-body"></div><div class="splus-modal-footer"><p class="splus-modal-footer-text">`
        + `${footerHTML}</p></div></div></div>`;

    document.body.appendChild(document.createElement("div")).innerHTML = modalHTML;

    this.id = id;
    this.element = document.getElementById(id);
    this.body = document.getElementById(id).querySelector(".splus-modal-body");
    this.onopen = openCallback;

    this.body.appendChild(contentElement);
}

function shouldProcessMutations(mutationList) {
    let processThis = false;

    // ensure we're processing more than an addition of something this very handler added
    for (let mutation of mutationList) {
        for (let addedElem of mutation.addedNodes) {
            if (addedElem.classList && !addedElem.classList.contains("splus-addedtodynamicdropdown")) {
                processThis = true;
                break;
            }
        }

        if (processThis) {
            break;
        }
    }

    return processThis;
}

let siteNavigationTileHelpers = {
    createSpacerTile: function () {
        return createElement("div", ["_3hM4e", "_3_a9F", "zJU7e", "util-width-zero-1OcAd", "_2oHes", "util-last-child-margin-right-zero-1DVn4", "splus-addedtodynamicdropdown"]);
    },
    isSpacerTile: function (element) {
        return element.childElementCount == 0;
    },
    // tiles must be mutable; caller must not care what happens to it
    // spaceToTotal = desired width
    createTilesRow: function (tiles, spaceToTotal) {
        if (!spaceToTotal) {
            spaceToTotal = targetRowWidth;
        }

        while (tiles.length < spaceToTotal) {
            tiles.push(siteNavigationTileHelpers.createSpacerTile());
        }

        // the two obfuscated classes are the ones Schoology has on its rows
        return createElement("div", ["_1tpub", "Kluyr", "splus-addedtodynamicdropdown"], {}, tiles);
    },

    // selector: (actual content container) (thing which just holds the inner body) (row of tiles)
    rowSelector: "div[role=\"menu\"] ._3mp5E._24W2g._26UWf ._1tpub.Kluyr"
};

// courses dropdown changes
(function () {
    let coursesDropdownContainer;

    let coursesDropdownObserver = new MutationObserver(function (mutationList) {
        if (!shouldProcessMutations(mutationList)) {
            return;
        }

        Logger.log("Processing courses dropdown mutation");

        if (Setting.getValue("archivedCoursesButton") === "show") {
            // aims to select the original "My Courses" link in the dropdown
            let candidateLink = coursesDropdownContainer.querySelector(".CjR09._8a6xl._1tpub > a[href=\"/courses\"]._3ghFm");
            if (candidateLink) {
                // the obfuscated class name is the one Schoology uses to float these links right
                let newContainer = createElement("div", ["courses-mycourses-droppeddown-link-container", "splus-addedtodynamicdropdown", "_3ghFm"], {}, [
                    createElement("a", ["floating-contained-link", "splus-addedtodynamicdropdown"], {
                        href: "/courses",
                        textContent: "My Courses"
                    }),
                    createElement("a", ["floating-contained-link", "splus-addedtodynamicdropdown"], {
                        href: "/courses/mycourses/past",
                        textContent: "Past Courses"
                    })
                ]);

                candidateLink.replaceWith(newContainer);
            }
        }

        // rearrange spacing in the courses dropdown
        // Schoology has 4 tiles per row by default, we want 6
        const targetRowWidth = 6;

        let rowContainer;
        let tiles = [];

        let needsReorganization = false;

        for (let tilesRow of coursesDropdownContainer.querySelectorAll(siteNavigationTileHelpers.rowSelector)) {
            if (!rowContainer) {
                rowContainer = tilesRow.parentElement;
            }
            if (tilesRow.childElementCount != targetRowWidth) {
                needsReorganization = true;
            }
            for (let tile of tilesRow.children) {
                if (!siteNavigationTileHelpers.isSpacerTile(tile)) {
                    tiles.push(tile);
                }
            }
        }

        // used later, clone the complete tiles list
        let contentTiles = tiles.slice(0);

        if (needsReorganization) {
            let nodeToDelete;
            while (nodeToDelete = coursesDropdownContainer.querySelector(siteNavigationTileHelpers.rowSelector)) {
                nodeToDelete.remove();
            }

            while (tiles.length > 0) {
                rowContainer.appendChild(siteNavigationTileHelpers.createTilesRow(tiles.splice(0, targetRowWidth), targetRowWidth));
            }
        }

        let tileWidthCap;

        if (contentTiles.length > 0) {
            tileWidthCap = window.getComputedStyle(contentTiles[0]).width;
        }

        // nicknames in courses dropdown
        // these need to be handled specially because it's not displayed as one contiguous block anymore
        for (let contentTile of contentTiles) {
            let cardData = contentTile.querySelector(".Card-card-data-17m6S");
            if (!cardData || cardData.querySelector(".splus-coursesdropdown-nicknamed-dataset") || cardData.childElementCount > 1) {
                // not a course, or already handled
                continue;
            }

            let courseAlias;
            if (cardData.parentElement.href) {
                let courseLinkMatch = cardData.parentElement.href.match(/\/course\/(\d+)\/?$/);
                if (courseLinkMatch) {
                    courseLinkMatch = courseLinkMatch[1];
                }
                if (courseLinkMatch && Setting.getValue("courseAliases")) {
                    courseAlias = Setting.getValue("courseAliases")[courseLinkMatch];
                }
            }

            if (!courseAlias) {
                continue;
            }

            // create our splus-coursesdropdown-nicknamed-dataset
            // we can't delete the old one because theming uses data from it
            cardData.firstElementChild.style.display = "none";

            // Schoology's styling: by default, card data has:
            // course name, in blue, at top: div._3U8Br._2s0LQ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB
            // section title, in black, in middle (most emphasized, I think): div._1wP6w._23_WZ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB
            // school name, in smaller gray at bottom: div._2wOCj.xjR5v._2qcpH._17Z60._1Aph-.gs0RB

            let origCourseTitle = cardData.firstElementChild.querySelector("div._3U8Br._2s0LQ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB");
            let origSectionTitle = cardData.firstElementChild.querySelector("div._1wP6w._23_WZ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB");
            let origSchoolTitle = cardData.firstElementChild.querySelector("div._2wOCj.xjR5v._2qcpH._17Z60._1Aph-.gs0RB");

            // stylistically equivalent to the other card data, in terms of our class list for the container element
            // FIXME: there's a stylistic incongruity between a nicknamed course in the dropdown and a non-nicknamed one
            let newCardDataChild = createElement("div", ["_36sHx", "_3M0N7", "fjQuT", "_1EyV_", "splus-coursesdropdown-nicknamed-dataset", "splus-addedtodynamicdropdown"], {}, [
                createElement("div", ["_1wP6w", "_23_WZ", "_2qcpH", "_3ghFm", "_17Z60", "_1Aph-", "gs0RB"], { textContent: courseAlias }), // stylized like section title
                createElement("div", ["_2wOCj", "xjR5v", "_2qcpH", "_17Z60", "_1Aph-", "gs0RB", "splus-coursealiasing-exempt"], { textContent: origCourseTitle.textContent + ": " + origSectionTitle.textContent }), // original full title, stylized like school name
                createElement("div", ["_2wOCj", "xjR5v", "_2qcpH", "_17Z60", "_1Aph-", "gs0RB"], { textContent: origSchoolTitle.textContent }) // school title, original styling and text
            ]);
            if (tileWidthCap) {
                newCardDataChild.style.maxWidth = tileWidthCap;
            }
            cardData.appendChild(newCardDataChild);
        }

        // reorder courses button
        let coursesHeader = coursesDropdownContainer.querySelector(".CjR09._8a6xl._1tpub > h2");
        if (coursesHeader && !coursesHeader.querySelector(".splus-coursesdropdown-reorder-btn")) {
            // https://www.flaticon.com/free-icon/sort_159800
            let newBtn = createElement("img", ["splus-coursesdropdown-reorder-btn", "splus-addedtodynamicdropdown"], { src: "https://image.flaticon.com/icons/svg/690/690319.svg", title: "Reorder Courses", alt: "Reorder Icon" });
            newBtn.onclick = () => location.href = "/courses?reorder";
            coursesHeader.appendChild(newBtn);
        }
    });

    for (let candidateLabel of document.querySelectorAll("#header nav ul > li span._1D8fw")) {
        if (candidateLabel.textContent == "Courses") {
            // a span inside a button inside a div (inside a li)
            coursesDropdownContainer = candidateLabel.parentElement.parentElement;

            // to make interaction throughout the rest of the codebase easier
            coursesDropdownContainer.parentElement.classList.add("splus-courses-navbar-button");
            break;
        }
    }

    if (!coursesDropdownContainer) {
        return;
    }

    coursesDropdownObserver.observe(coursesDropdownContainer, { childList: true, subtree: true });
})();

// groups dropdown changes
(function () {
    let groupsDropdownContainer;

    let groupsDropdownObserver = new MutationObserver(function (mutationList) {
        if (!shouldProcessMutations(mutationList)) {
            return;
        }

        Logger.log("Processing groups dropdown mutation");

        // rearrange spacing in the courses dropdown
        // Schoology has 4 tiles per row by default, we want 6
        // primarily we do this to match the courses dropdown
        const targetRowWidth = 6;

        let rowContainer;
        let tiles = [];

        let needsReorganization = false;

        for (let tilesRow of groupsDropdownContainer.querySelectorAll(siteNavigationTileHelpers.rowSelector)) {
            if (!rowContainer) {
                rowContainer = tilesRow.parentElement;
            }
            if (tilesRow.childElementCount != targetRowWidth) {
                needsReorganization = true;
            }
            for (let tile of tilesRow.children) {
                if (!siteNavigationTileHelpers.isSpacerTile(tile)) {
                    tiles.push(tile);
                }
            }
        }

        if (needsReorganization) {
            let nodeToDelete;
            while (nodeToDelete = groupsDropdownContainer.querySelector(siteNavigationTileHelpers.rowSelector)) {
                nodeToDelete.remove();
            }

            while (tiles.length > 0) {
                rowContainer.appendChild(siteNavigationTileHelpers.createTilesRow(tiles.splice(0, targetRowWidth), targetRowWidth));
            }
        }
    });

    for (let candidateLabel of document.querySelectorAll("#header nav ul > li span._1D8fw")) {
        if (candidateLabel.textContent == "Groups") {
            // a span inside a button inside a div (inside a li)
            groupsDropdownContainer = candidateLabel.parentElement.parentElement;

            // to make interaction throughout the rest of the codebase easier
            groupsDropdownContainer.parentElement.classList.add("splus-groups-navbar-button");
            break;
        }
    }

    if (!groupsDropdownContainer) {
        return;
    }

    groupsDropdownObserver.observe(groupsDropdownContainer, { childList: true, subtree: true });
})();

// "More..." dialog changes
(function () {
    let navigationElementsContainer = document.querySelector("#header nav > ul:nth-child(1)");

    let fixNavButtons = (function () {
        let moreNavElement = navigationElementsContainer.querySelector("li > button[aria-label=\"More\"]");
        let alreadyTweakedResourcesBtn = navigationElementsContainer.querySelector("li.splus-nav-resources-lowwidth");
        let fakeGradesBtn = navigationElementsContainer.querySelector("li.splus-nav-grades-directlink-lowwidth");
        if (moreNavElement) {
            moreNavElement = moreNavElement.parentElement;
        } else {
            // in a high width case
            // we need to determine if this is a transition or if the changes are irrelevant
            if (alreadyTweakedResourcesBtn) {
                alreadyTweakedResourcesBtn.style.display = "initial";
            }
            if (fakeGradesBtn) {
                fakeGradesBtn.style.display = "none";
            }
        }

        if (!moreNavElement || moreNavElement.classList.contains("splus-moremenu-gradesreadded")) {
            return;
        }

        moreNavElement.classList.add("splus-moremenu-gradesreadded");

        // remove the resources button - we're going to replace it with a grade report button
        let resLink = moreNavElement.previousElementSibling;
        if (resLink.querySelector("a").href.endsWith("/resources")) {
            resLink.classList.add("splus-nav-resources-lowwidth");
            resLink.style.display = "none";

            let gradesBtn = document.createElement("li");
            gradesBtn.classList.add("_24avl");
            gradesBtn.classList.add("_3Rh90");
            gradesBtn.classList.add("splus-nav-grades-directlink-lowwidth");
            gradesBtn.innerHTML = '<a class="_1SIMq _2kpZl _3OAXJ _13cCs _3_bfp _2M5aC _24avl _3v0y7 _2s0LQ _3ghFm _3LeCL _31GLY _9GDcm _1D8fw util-height-six-3PHnk util-line-height-six-3lFgd util-text-decoration-none-1n0lI Header-header-button-active-state-3AvBm Header-header-button-1EE8Y sExtlink-processed" href="/grades/grades">Grades</a>';
            moreNavElement.insertAdjacentElement("beforebegin", gradesBtn);
        } else if (fakeGradesBtn) {
            if (alreadyTweakedResourcesBtn) {
                alreadyTweakedResourcesBtn.style.display = "none";
            }
            fakeGradesBtn.style.display = "initial";
        }
    });

    let navigationElementsObserver = new MutationObserver(function (mutationList) {
        if (!shouldProcessMutations(mutationList)) {
            return;
        }

        // spacing around the More... menu [reolace "Resources" with "Grades"]
        fixNavButtons();

        // the More... menu itself
        (function () {
            let moreMenuDropdownList = navigationElementsContainer.querySelector("li > div[role=\"menu\"] > ul.util-flex-shrink-zero-3HoBE:nth-child(1)");
            if (!moreMenuDropdownList || moreMenuDropdownList.classList.contains("splus-moremenuentries-gradesprocessed")) {
                return;
            }

            moreMenuDropdownList.classList.add("splus-moremenuentries-gradesprocessed");

            // remove the grades optiony menu that's under "more"
            moreMenuDropdownList.querySelector("button[data-submenu=\"grades\"]").parentElement.remove();

            // first element child is the search bar
            // we want to insert directly after that
            let insertAfter = moreMenuDropdownList.firstElementChild;

            let masteryLink = document.createElement("li");
            // use Schoology's convoluted class list, as presented in the original
            masteryLink.innerHTML = '<a aria-label="Mastery Grades" href="/mastery" class="Header-header-button-active-state-3AvBm Header-header-drop-menu-3SaYV Header-header-drop-menu-item-3d3IZ _2JX1Q _1k0yk _1tpub _3_bfp _3ghFm xjR5v _3lLLU _2gJbx util-text-decoration-none-1n0lI">Mastery Grades</a>';

            insertAfter.insertAdjacentElement("afterend", masteryLink);

            let resourcesLink = document.createElement("li");
            resourcesLink.innerHTML = '<a aria-label="Resources" href="/resources" class="Header-header-button-active-state-3AvBm Header-header-drop-menu-3SaYV Header-header-drop-menu-item-3d3IZ _2JX1Q _1k0yk _1tpub _3_bfp _3ghFm xjR5v _3lLLU _2gJbx util-text-decoration-none-1n0lI">Resources</a>';

            insertAfter.insertAdjacentElement("afterend", resourcesLink);
        })();
    });

    navigationElementsObserver.observe(navigationElementsContainer, { childList: true, subtree: true });


    // fix the nav buttons (for "fix" as defined above) immediately - this handles a page initially loading as low-width

    if (document.readyState === "complete" ||
        (document.readyState !== "loading" && !document.documentElement.doScroll)) {
        fixNavButtons();
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            fixNavButtons();
        }, false);
    }
})();

// Reorder UI custom icons
(function () {
    let docObserver = new MutationObserver(function (mutationList) {
        if (!shouldProcessMutations(mutationList)) {
            return;
        }

        // make sure the reorder UI is visible; if not, don't try the expensive query
        let reorderHeader = document.querySelector("header.LGaPf h1._3eD4l._3UytQ._3v0y7._16XsF._8a6xl");
        if (!reorderHeader || reorderHeader.textContent != "Reorder Courses") {
            return;
        }

        // cards in the reorder UI
        let reorderUiCards = document.querySelectorAll("div._1Z0RM._1tpub._2V6ED._3xHd3.L1I_b._9GENG._3LeCL._34eht._349XD.fjQuT.uQOmx._17X0S._36TKt._3qXK_._3WTX2.Mcjpm._4iu5i.jDhMt._3WDJD.CrxjQ[role=\"dialog\"][aria-labelledby*=\"reorder-ui\"] div._1Z0RM._3skcp._5jizS._1tpub._1SnLN._3LeCL._3lLLU._2gJbx.Card-card-2rORL");

        let reprocessPictures = [];

        for (let classCard of reorderUiCards) {
            let classImg = classCard.querySelector("img._2oHes");
            if (!classImg) {
                continue;
            }

            // div containing course, section, and school names
            let descDiv = classCard.querySelector("div._1wP6w._2s0LQ._2qcpH._1XYMV._17Z60._2oHes");

            // <COURSE NAME>: <SECTION NAME>
            let nameComponents = [];
            for (let descPart of descDiv.querySelectorAll("div:not([class])")) {
                nameComponents.push(descPart.textContent);
            }

            classImg.alt = "Profile picture for " + nameComponents.join(": ");
            reprocessPictures.push(classImg);
        }

        Theme.setProfilePictures(reprocessPictures);
    });

    docObserver.observe(document.body, { childList: true, subtree: true });
})();

async function createQuickAccess() {
    let rightCol = document.getElementById("right-column-inner");
    let linkWrap;

    let wrapper = createElement("div", ["quick-access-wrapper"], {}, [
        createElement("h3", ["h3-med"], { title: "Added by Schoology Plus" }, [
            createSvgLogo("splus-logo-inline"),
            // createElement("img", ["splus-logo-inline"], { src: chrome.runtime.getURL("imgs/plus-icon.png"), title: "Provided by Schoology Plus" }),
            createElement("span", [], { textContent: "Quick Access" }),
            createElement("a", ["quick-right-link", "splus-track-clicks"], { id: "quick-access-splus-settings", textContent: "Settings", href: "#splus-settings#setting-input-quickAccessVisibility" })
        ]),
        createElement("div", ["date-header", "first"], {}, [
            createElement("h4", [], { textContent: "Pages" })
        ]),
        (linkWrap = createElement("div", ["quick-link-wrapper"]))
    ]);

    const PAGES = [
        { textContent: "Grade Report", href: "/grades/grades", id: "quick-access-grades" },
        { textContent: "Courses", href: "/courses", id: "quick-access-courses" },
        { textContent: "Mastery", href: "/mastery", id: "quick-access-mastery" },
        { textContent: "Groups", href: "/groups", id: "quick-access-groups" },
        { textContent: "Messages", href: "/messages", id: "quick-access-messages" },
    ];

    for (let page of PAGES) {
        let a = linkWrap.appendChild(createElement("a", ["quick-link", "splus-track-clicks"], page));
        a.dataset.splusTrackingLabel = "Quick Access";
    }

    wrapper.appendChild(
        createElement("div", ["date-header"], {}, [
            createElement("h4", [], {}, [
                createElement("span", [], { textContent: "Courses" }),
                createElement("a", ["quick-right-link", "splus-track-clicks"], { id: "quick-access-reorder", textContent: "Reorder", href: "/courses?reorder" })
            ])
        ])
    );

    let sectionsList = (await fetchApiJson(`users/${getUserId()}/sections`)).section;

    if (!sectionsList || sectionsList.length == 0) {
        wrapper.appendChild(createElement("p", ["quick-access-no-courses"], { textContent: "No courses found" }));
    } else {
        let courseOptionsButton;
        let iconImage;
        for (let section of sectionsList) {
            wrapper.appendChild(createElement("div", ["quick-access-course"], {}, [
                (iconImage = createElement("div", ["splus-course-icon"], { dataset: { courseTitle: `${section.course_title}: ${section.section_title}` } })),
                createElement("a", ["splus-track-clicks", "quick-course-link"], { textContent: `${section.course_title}: ${section.section_title}`, href: `/course/${section.id}`, dataset: { splusTrackingTarget: "quick-access-course-link", splusTrackingLabel: "Quick Access" } }),
                createElement("div", ["icons-container"], {}, [
                    createElement("a", ["icon", "icon-grades", "splus-track-clicks"], { href: `/course/${section.id}/student_grades`, title: "Grades", dataset: { splusTrackingTarget: "quick-access-grades-link", splusTrackingLabel: "Quick Access" } }),
                    createElement("a", ["icon", "icon-mastery", "splus-track-clicks"], { href: `/course/${section.id}/student_mastery`, title: "Mastery", dataset: { splusTrackingTarget: "quick-access-mastery-link", splusTrackingLabel: "Quick Access" } }),
                    (courseOptionsButton = createElement("a", ["icon", "icon-settings", "splus-track-clicks"], { href: "#", dataset: { splusTrackingTarget: "quick-access-settings-link", splusTrackingLabel: "Quick Access" } }))
                ])
            ]));

            iconImage.style.backgroundImage = `url(${chrome.runtime.getURL("imgs/fallback-course-icon.svg")})`;

            courseOptionsButton.addEventListener("click", () => openModal("course-settings-modal", {
                courseId: section.id,
                courseName: `${section.course_title}: ${section.section_title}`
            }));
        }
    }

    switch (Setting.getValue("quickAccessVisibility")) {
        case "belowOverdue":
            rightCol.querySelector(".overdue-submissions").insertAdjacentElement("afterend", wrapper);
            break;
        case "bottom":
            rightCol.append(wrapper);
            break;
        default:
            rightCol.prepend(wrapper);
            break;
    }
}

Logger.log("Finished loading all.js");