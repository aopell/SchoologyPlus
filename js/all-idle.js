// patch for arrow menu in Firefox
(function () {
    let arrow = document.getElementById("primary-settings");
    let content = arrow.innerHTML;
    arrow.innerHTML = "";
    arrow.innerHTML = content;
    let arrowMenu = document.querySelector("#primary-settings>a");
    let dropdown = document.getElementById("settings-menu-dropdown");
    arrowMenu.removeAttribute("href");
    arrowMenu.style.cursor = "pointer";
    arrowMenu.addEventListener("click", function (event) {
        if (isVisible(dropdown)) {
            dropdown.style.display = "none";
            arrowMenu.classList.remove("active");
        } else {
            dropdown.style.display = "block";
            arrowMenu.classList.add("active");
        }
    });
    document.body.addEventListener("click", function (event) {
        if (getParents(event.target, "#primary-settings").length == 0) {
            dropdown.style.display = "none";
            arrowMenu.classList.remove("active");
        }
    });
})();

// theme loading, with course icon overriding
(function () {
    let themesList = document.getElementById("themes-list");
    if (storage.themes) {
        for (let t of storage.themes) {
            let closeButton = createElement("a", ["close-button"], { textContent: "×", href: "#", title: "Delete Theme", onclick: (event) => deleteTheme(event.target.dataset.themeName) });
            closeButton.dataset.themeName = t.name;
            let exportButton = createElement("a", ["export-button"], { textContent: "↗", href: "#", title: "Export Theme", onclick: () => alert("Copied to clipboard") });
            exportButton.dataset.clipboardText = JSON.stringify(t, null, 4);
            themesList.appendChild(createElement("h3", ["setting-description"], {}, [
                closeButton,
                exportButton,
                createElement("span", [], { textContent: " " + t.name })
            ]));
        }
    }

    if (!storage.themes || storage.themes.length === 0) {
        themesList.appendChild(createElement("h3", ["close-button"], { textContent: "No themes installed" }));
    }

    new Clipboard(".export-button");

    if (storage.courseIcons != "disabled") {

        Theme.setProfilePictures();

        let resetIconsOnMutate = function (target, predicate) {
            // slight hack: if predicate defined, be broader about observation
            // allows the course dashboard junk to work
            let config = { childList: true, subtree: !!predicate };
            let observer = new MutationObserver(() => 0);

            let callback = (mutationsList) => {
                if (predicate && !predicate(mutationsList)) {
                    // predicate is defined, but returns false
                    // not yet
                    return;
                }

                Theme.setProfilePictures();
                observer.disconnect();
            };

            observer = new MutationObserver(callback);
            observer.observe(target, config);
        };

        // courses dropdown (all pages)
        let target = document.querySelector(".sections-list");
        if (target) {
            // TODO why might this be null?
            resetIconsOnMutate(target);
        }
        // course dashboard
        let mainInner = document.getElementById("main-inner");

        if (mainInner && window.location.pathname == "/home/course-dashboard") {
            resetIconsOnMutate(mainInner, function (mutationsList) {
                return !!mainInner.querySelector(".course-dashboard .sgy-card-lens");
            });
        }
    }
})();

// hack for course aliases
(async function () {
    let apiKeys = await getApiKeys();

    let myClassData = await fetch(`https://api.schoology.com/v1/users/${apiKeys[2]}/sections`, {
        headers: createApiAuthenticationHeaders(apiKeys)
    });
    let myClasses = (await myClassData.json()).section;

    console.log("Classes loaded, building alias stylesheet");
    // https://stackoverflow.com/a/707794 for stylesheet insertion
    let sheet = window.document.styleSheets[0];

    for (let aliasedCourseId in storage.courseAliases) {
        // https://stackoverflow.com/a/18027136 for text replacement
        sheet.insertRule(`span.course-name-wrapper-${aliasedCourseId} {
            visibility: hidden;
            word-spacing:-999px;
            letter-spacing: -999px;
        }`, sheet.cssRules.length);
        sheet.insertRule(`span.course-name-wrapper-${aliasedCourseId}:after {
            content: "${storage.courseAliases[aliasedCourseId]}";
            visibility: visible;
            word-spacing:normal;
            letter-spacing:normal; 
        }`, sheet.cssRules.length);
    }

    console.log("Applying aliases");
    if (storage.courseAliases) {
        let applyCourseAliases = function (mutationsList) {
            let rootElement = document.body;

            if (mutationsList && mutationsList.length == 0) {
                return;
            }

            if (mutationsList && mutationsList.length == 1) {
                rootElement = mutationsList[0].target;
            }

            for (let jsonCourse of myClasses) {
                if (!storage.courseAliases[jsonCourse.id]) {
                    continue;
                }

                let findText = jsonCourse.course_title + ": " + jsonCourse.section_title;
                let wrapClassName = "course-name-wrapper-" + jsonCourse.id;

                findAndReplaceDOMText(rootElement, {
                    find: findText,
                    wrap: "span",
                    wrapClass: wrapClassName
                });

                document.title = document.title.replace(findText, storage.courseAliases[jsonCourse.id]);

                // cleanup: if we run this replacement twice, we'll end up with unnecessary nested elements <special-span><special-span>FULL COURSE NAME</special-span></special-span>
                let nestedSpan;
                while (nestedSpan = document.querySelector(`span.${wrapClassName}>span.${wrapClassName}`)) {
                    let parentText = nestedSpan.textContent;
                    let parentElem = nestedSpan.parentElement;
                    while (parentElem.firstChild) {
                        parentElem.firstChild.remove();
                    }
                    parentElem.textContent = parentText;
                }
            }

        };

        // wait for the page to "cool down" a bit before we begin intensive monitoring - 100ms sleep
        //await new Promise(resolve => setTimeout(resolve, 100));

        applyCourseAliases();

        // beware of performance implications of observing document.body
        let aliasPrepObserver = new MutationObserver(function (mutationsList) {
            applyCourseAliases(mutationsList.filter(function (mutation) {
                for(let cssClass of mutation.target.classList){
                    // target blacklist
                    // we don't care about some (especially frequent and performance-hurting) changes
                    if(cssClass.startsWith("course-name-wrapper-")){
                        // our own element, we don't care
                        return false;
                    }
                    if(cssClass.includes("pendo")){
                        // Schoology's analytics platform, we don't care
                        return false;
                    }
                }
                
                return true;
            }));
        });
        aliasPrepObserver.observe(document.body, { childList: true, subtree: true });
    }
})();