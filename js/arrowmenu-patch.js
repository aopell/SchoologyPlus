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