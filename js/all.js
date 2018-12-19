// Page Modifications

document.head.appendChild(createElement("meta", [], { name: "viewport", content: "width=device-width, initial-scale=1" }));
let bottom = document.querySelector("span.Footer-copyright-2Vt6I");
bottom.appendChild(createElement("span", ["footer-divider"], { textContent: "|" }, [
    createElement("span", ["footer-text-enhanced-by"], { textContent: "Enhanced by Schoology Plus" }),
]));

document.documentElement.style.setProperty("--default-visibility", "visible");

let footerText = `&copy; Aaron Opell, Glen Husman 2018 | <a href="${getBrowser() == "Chrome" ? `https://chrome.google.com/webstore/detail/${chrome.runtime.id}` : "https://github.com/aopell/SchoologyPlus/releases/latest"}">Schoology Plus v${chrome.runtime.getManifest().version_name || chrome.runtime.getManifest().version}${getBrowser() != "Chrome" || chrome.runtime.getManifest().update_url ? '' : ' dev'}</a> | <a href="https://github.com/aopell/SchoologyPlus/issues/new" title="Submit bug report or feature request">Send Feedback</a> | <a href="https://github.com/aopell/SchoologyPlus">GitHub</a> | <a href="#" id="open-contributors">Contributors</a> | <a href="#" id="open-changelog"> Changelog</a>`;

let frame = document.createElement("iframe");
frame.src = "https://aopell.me/SchoologyPlus/changelog";

let modals = [
    new Modal(
        "settings-modal",
        "Schoology Plus Settings",
        getModalContents(),
        footerText,
        openOptionsMenu
    ),
    new Modal(
        "changelog-modal",
        "Schoology Plus Changelog",
        createElement("div", ["splus-modal-contents"], {}, [frame]),
        "&copy; Aaron Opell, Glen Husman 2018"
    ),
    new Modal(
        "contributors-modal",
        "Schoology Plus Contributors",
        createElement("div", ["splus-modal-contents"], undefined, [
            createElement("h2", ["setting-entry"], { textContent: "Contributors" }),
            createElement("div", ["setting-entry"], {}, [
                createElement("h3", ["setting-title"], {}, [
                    createElement("a", [], { href: "https://github.com/aopell", textContent: "Aaron Opell" })
                ]),
                createElement("p", ["setting-description"], { textContent: "Extension creator; lead developer" })
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h3", ["setting-title"], {}, [
                    createElement("a", [], { href: "https://github.com/glen3b", textContent: "Glen Husman" })
                ]),
                createElement("p", ["setting-description"], { textContent: "Lead developer" })
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
                        })(["DinosoftLabs", "Eucalyp", "Flat Icons", "Freepik", "Maxim Basinski", "Pixel Buddha", "Smashicons", "Twitter", "Vectors Market"])
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
                createElement("h3", ["setting-title"], { textContent: "Disclaimer" }),
                createElement("p", ["setting-description"], { textContent: "Schoology Plus is not affiliated with Schoology Inc. or the Los Angeles Unified School District. Schoology, the SCHOOLOGY® wordmark, and the S logo are registered and unregistered trademarks of Schoology, Inc. in the United States. All product names, logos, and brands are property of their respective owners." })
            ])
        ]),
        "&copy; Aaron Opell, Glen Husman 2018"
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
        Theme.profilePictureOverrides.push([escapeRegExp(course.course_title) + " ?: " + escapeRegExp(course.section_title), course.profile_url]);
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
    }
    else if (data.key === "Escape") {
        video.style.visibility = "hidden";
        video.pause();
    }
    data.preventDefault = false;
};

document.querySelector("#header > header > nav > ul:nth-child(2)").prepend(createElement("li", ["_24avl", "_3Rh90", "_349XD"], {}, [
    createElement(
        "a",
        ["_1SIMq", "_2kpZl", "_3OAXJ", "_13cCs", "_3_bfp", "_2M5aC", "_24avl", "_3v0y7", "_2s0LQ", "_3ghFm", "_3LeCL", "_31GLY", "_9GDcm", "_1D8fw", "util-height-six-3PHnk", "util-line-height-six-3lFgd", "util-text-decoration-none-1n0lI", "Header-header-button-active-state-3AvBm", "Header-header-button-1EE8Y", "sExtlink-processed"],
        { href: "#", onclick: () => openModal("settings-modal") },
        [
            createElement("img", ["Header-two-point-two-ONgMZ", "Header-two-point-two-ONgMZ", "_1I3mg"], { src: chrome.runtime.getURL("imgs/new-plus-icon.svg") })
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

    let mm = modals.find(m => m.id == id);
    if (mm.onopen) mm.onopen(mm, options);
    mm.element.style.display = "block";
}

function modalClose(element) {
    element = element.target ? document.getElementById(element.target.dataset.parent) : element;

    if (element == modals.find(m => m.id == "settings-modal").element && Setting.anyModified()) {
        if (!confirm("You have unsaved settings.\nAre you sure you want to exit?")) return;
        updateSettings();
    }

    element.style.display = "none";
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

Logger.log("Finished loading all.js");