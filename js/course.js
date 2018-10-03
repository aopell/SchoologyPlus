let courseIdNumber;
(function () {
    let sidebar = document.querySelector(".course-info-wrapper dl");
    if (sidebar) {
        let button = createButton("splus-course-options", "Course Options");
        let img = createElement("img", [], { src: chrome.runtime.getURL("imgs/plus-icon.png"), width: 19 });
        img.style.marginLeft = "8px";
        img.style.marginTop = "4px";
        button.prepend(img);
        button.querySelector("input").style.paddingLeft = "4px";
        button.style.cursor = "pointer";
        button.addEventListener("click", () => openModal("course-settings-modal"));

        sidebar.appendChild(button);
        courseIdNumber = document.location.href.match(/\/(\d+)\//)[1];
    }
})();

modals.push(new Modal("course-settings-modal", "Course Options", createElement("div", ["splus-modal-contents"], {}, [
    createElement("div", ["setting-entry"], {}, [
        createElement("h2", ["setting-title"], { textContent: "Alias: " }, [
            createElement("input", [], { type: "text", id: "setting-input-course-alias" }, [])
        ])
    ]),
    createElement("h2", ["setting-entry"], { textContent: "Grading Scale" }),
    createElement("div", ["setting-entry"], {}, [
        createElement("table", [], { id: "grading-scale-wrapper" }, [
            createElement("tr", [], {}, [
                createElement("th", [], { textContent: "Minimum Percentage" }),
                createElement("th", [], { textContent: "Grade Symbol" })
            ])
        ]),
        createElement("p", ["add-grade-symbol"], {}, [
            createElement("a", [], { textContent: "Add Grading Symbol", href: "#", onclick: (event) => createRow() })
        ])
    ]),
    createElement("div", ["settings-buttons-wrapper"], undefined, [
        createButton("save-course-settings", "Save Settings", saveCourseSettings),
        createElement("a", ["restore-defaults"], { textContent: "Restore Defaults", onclick: restoreCourseDefaults, href: "#" })
    ])
]), "&copy; Aaron Opell, Glen Husman 2018", setCourseOptionsContent));

document.querySelector("#course-settings-modal .close").onclick = modalClose;

const defaultGradingScale = { "90": "A", "80": "B", "70": "C", "60": "D", "0": "F" };
let gradingScale = defaultGradingScale;

function setCourseOptionsContent() {
    for (let e of document.querySelectorAll(".grade-symbol-row")) {
        e.parentElement.removeChild(e);
    }
    gradingScale = (storage.gradingScales || {})[courseIdNumber] || gradingScale;

    for (let p of Object.keys(gradingScale).sort((a, b) => a - b).reverse()) {
        createRow(p, gradingScale[p]);
    }

    let aliasInput = document.getElementById("setting-input-course-alias");
    if (storage.courseAliases && storage.courseAliases[courseIdNumber]) {
        aliasInput.value = storage.courseAliases[courseIdNumber];
    }
}

function createRow(percentage, symbol) {
    let gradingScaleWrapper = document.getElementById("grading-scale-wrapper");
    let row = createElement("tr", ["grade-symbol-row"], {}, [
        createElement("td", [], {}, [
            createElement("input", [], { type: "text", value: percentage || "" })
        ]),
        createElement("td", [], {}, [
            createElement("input", [], { type: "text", value: symbol || "" })
        ]),
        createElement("td", [], {}, [
            createElement("a", ["close-button"], { textContent: "×", href: "#", title: "Delete Grade Symbol", onclick: (event) => event.target.parentElement.parentElement.outerHTML = "" })
        ])
    ]);
    gradingScaleWrapper.appendChild(row);
}

function saveCourseSettings() {
    let currentValue = storage.gradingScales || {};
    let scale = {};
    for (let r of document.querySelectorAll(".grade-symbol-row")) {
        let inputBoxes = r.querySelectorAll("input");
        if (inputBoxes[0].value && inputBoxes[1].value) {
            scale[inputBoxes[0].value] = inputBoxes[1].value;
        } else {
            alert("Values cannot be empty!");
            return;
        }
    }
    currentValue[courseIdNumber] = scale;

    let currentAliasesValue = storage.courseAliases || {};
    currentAliasesValue[courseIdNumber] = document.getElementById("setting-input-course-alias").value;

    chrome.storage.sync.set({ gradingScales: currentValue }, x => {
        chrome.storage.sync.set({ courseAliases: currentAliasesValue }, y => {
            let settingsSaved = document.getElementById("save-course-settings");
            settingsSaved.value = "Saved!";
            setTimeout(() => {
                location.reload();
            }, 1000);
        });
    });
}

function restoreCourseDefaults() {
    let currentValue = storage.gradingScales || {};
    currentValue[courseIdNumber] = defaultGradingScale;
    
    let currentAliasesValue = storage.courseAliases || {};
    currentAliasesValue[courseIdNumber] = null;

    chrome.storage.sync.set({ gradingScales: currentValue }, x => {
        chrome.storage.sync.set({ courseAliases: currentAliasesValue }, y => {
            alert("Settings restored. Reloading.");
            location.reload();
        });
    });
}