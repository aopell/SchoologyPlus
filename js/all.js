// Page Modifications

document.head.appendChild(createElement("meta", [], { name: "viewport", content: "width=device-width, initial-scale=1" }));
let bottom = document.querySelector("span.Footer-copyright-2Vt6I");
bottom.appendChild(createElement("span", ["footer-divider"], { textContent: "|" }, [
    createElement("span", ["footer-text-enhanced-by"], { textContent: "Enhanced by Schoology Plus" }),
]));

document.documentElement.style.setProperty("--default-visibility", "visible");

let verboseModalFooterText = `&copy; Aaron Opell, Glen Husman 2017-2019 | <a href="${getBrowser() == "Chrome" ? `https://chrome.google.com/webstore/detail/${chrome.runtime.id}` : "https://github.com/aopell/SchoologyPlus/releases/latest"}">Schoology Plus v${chrome.runtime.getManifest().version_name || chrome.runtime.getManifest().version}${getBrowser() != "Chrome" || chrome.runtime.getManifest().update_url ? '' : ' dev'}</a> | <a href="https://aopell.github.io/SchoologyPlus/discord.html" title="Get support, report bugs, suggest features, and chat with the Schoology Plus community">Discord Support Server</a> | <a href="https://github.com/aopell/SchoologyPlus">GitHub</a> | <a href="#" id="open-contributors">Contributors</a> | <a href="#" id="open-changelog"> Changelog</a>`;
let modalFooterText = "Schoology Plus";

let frame = document.createElement("iframe");
frame.src = "https://aopell.me/SchoologyPlus/changelog";

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
                        })(["DinosoftLabs", "Eucalyp", "Flat Icons", "Freepik", "Maxim Basinski", "Pixel Buddha", "Smashicons", "Twitter", "Vectors Market", "srip", "surang", "Pixelmeetup"])
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
    document.documentElement.classList.add("splus-modal-open");
}

function modalClose(element) {
    element = element.target ? document.getElementById(element.target.dataset.parent) : element;

    if (element == modals.find(m => m.id == "settings-modal").element && Setting.anyModified()) {
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
            let newBtn = createElement("img", ["splus-coursesdropdown-reorder-btn", "splus-addedtodynamicdropdown"], { src: "https://image.flaticon.com/icons/svg/159/159800.svg", title: "Reorder Courses", alt: "Reorder Icon" });
            newBtn.onclick = () => document.querySelector("#reorder-ui button.link-btn").click();
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

    if (!document.getElementById("reorder-ui")) {
        let reorderUiContainer = document.createElement("div");
        reorderUiContainer.style.display = "none";
        reorderUiContainer.innerHTML = '<div id="reorder-ui"><div class="_3W1Kw"><div><button class="link-btn" role="button" style="height: 100%;"><span class="Reorder-reorder-icon-15wl2"></span>Reorder Courses</button></div></div></div>';
        document.body.appendChild(reorderUiContainer);
        let newScript = createElement("script", [], { src: "https://ui.schoology.com/platform/reorder-ui/bundle.0.1.1.js", async: true, id: "reorder-ui-script" });

        // start the fetch langprops task
        fetch(chrome.runtime.getURL("/lib/data/schoology-reorder-ui-langprops.json"))
            .then(x => x.text())
            .then(x => newScript.dataset.props = x)
            .then(() => reorderUiContainer.appendChild(newScript));
    }
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

Logger.log("Finished loading all.js");