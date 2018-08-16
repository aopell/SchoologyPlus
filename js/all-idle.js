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