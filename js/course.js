let courseIdNumber;
let courseSettingsCourseName;
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
        button.addEventListener("click", () => openModal("course-settings-modal", { courseId: document.location.href.match(/\/(\d+)\//)[1], courseName: document.querySelector(".page-title").textContent }));

        sidebar.appendChild(button);
    }
})();

modals.push(new Modal("course-settings-modal", "Course Options", createElement("div", [], {}, [
    createElement("div", ["splus-modal-contents"], {}, [
        createElement("div", ["setting-entry"], {}, [
            createElement("h1", ["setting-title"], { id: "course-options-course-name" })
        ]),
        createElement("div", ["setting-entry"], {}, [
            createElement("h2", ["setting-title"], {}, [
                createElement("label", ["centered-label"], { textContent: "Nickname: ", htmlFor: "setting-input-course-alias" }),
                createElement("input", [], { type: "text", id: "setting-input-course-alias" }, [])
            ]),
            createElement("p", ["setting-description"], { textContent: "A frendlier name for a course that shows anywhere the full name for the course would normally" })
        ]),
        createElement("div", ["setting-entry"], {}, [
            createElement("h2", [], { textContent: "Grading Scale" }),
            createElement("p", ["setting-description"], { textContent: "This grading scale is used to show letter grades when teachers don't set them, and for calculating the minimum score needed on an assignment for a grade" }),
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
    ]),
    createElement("div", ["settings-buttons-wrapper"], undefined, [
        createButton("save-course-settings", "Save Settings", saveCourseSettings),
        createElement("a", ["restore-defaults"], { textContent: "Restore Defaults", onclick: restoreCourseDefaults, href: "#" })
    ])
]), "&copy; Aaron Opell, Glen Husman 2018", setCourseOptionsContent));

document.querySelector("#course-settings-modal .close").onclick = modalClose;

const defaultGradingScale = { "90": "A", "80": "B", "70": "C", "60": "D", "0": "F" };
let gradingScale = defaultGradingScale;

function setCourseOptionsContent(modal, options) {
    document.getElementById("course-options-course-name").textContent = options.courseName || "<UNKNOWN COURSE>";
    courseSettingsCourseName = options.courseName;
    courseIdNumber = options.courseId ? options.courseId : courseIdNumber;

    for (let e of document.querySelectorAll(".grade-symbol-row")) {
        e.parentElement.removeChild(e);
    }
    gradingScale = (Setting.getValue("gradingScales") || {})[courseIdNumber] || gradingScale;

    for (let p of Object.keys(gradingScale).sort((a, b) => a - b).reverse()) {
        createRow(p, gradingScale[p]);
    }

    let aliasInput = document.getElementById("setting-input-course-alias");
    if (Setting.getValue("courseAliases") && Setting.getValue("courseAliases")[courseIdNumber]) {
        aliasInput.value = Setting.getValue("courseAliases")[courseIdNumber];
    } else {
        aliasInput.value = "";
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
    let currentValue = Setting.getValue("gradingScales") || {};
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

    let currentAliasesValue = Setting.getValue("courseAliases") || {};
    currentAliasesValue[courseIdNumber] = document.getElementById("setting-input-course-alias").value;

    Setting.setValues({ gradingScales: currentValue, courseAliases: currentAliasesValue }, () => {
        let settingsSaved = document.getElementById("save-course-settings");
        settingsSaved.value = "Saved!";
        setTimeout(() => {
            location.reload();
        }, 1000);
    });
}

function restoreCourseDefaults() {
    let currentValue = Setting.getValue("gradingScales") || {};
    currentValue[courseIdNumber] = defaultGradingScale;

    let currentAliasesValue = Setting.getValue("courseAliases") || {};
    currentAliasesValue[courseIdNumber] = null;

    if (confirm(`Are you sure you want to reset all options for the course "${courseSettingsCourseName}" to their default values? This action is irreversible.`)) {
        Setting.setValues({ gradingScales: currentValue, courseAliases: currentAliasesValue }, () => {
            alert("Settings restored. Reloading.");
            location.reload();
        });
    }
}