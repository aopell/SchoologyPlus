(function () {
    let sidebar = document.getElementById("content-left");
    if (sidebar) {
        let button = createButton("splus-user-courses-in-common-btn", "Courses In Common");
        let img = createElement("img", [], { src: chrome.runtime.getURL("imgs/plus-icon.png"), width: 19 });
        img.style.marginLeft = "8px";
        img.style.marginTop = "4px";
        button.prepend(img);
        button.querySelector("input").style.paddingLeft = "4px";
        button.style.cursor = "pointer";
        button.addEventListener("click", () => openModal("user-courses-in-common-modal", { userId: document.location.href.match(/\/(\d+)\//)[1] }));

        sidebar.appendChild(button);
    }
})();

function clearNodeChildren(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function setCourseListModalContent(modal, options) {
    let listElem = document.getElementById("user-courses-in-common-list");
    clearNodeChildren(listElem);
    listElem.appendChild(createElement("li", [], { textContent: "Loading..." }));
    (async function () {
        let otherUserId = options.userId;
        try {
            let myClasses = (await fetchApiJson(`/users/${getUserId()}/sections`));
            // TODO fetch member lists and compare, appending stuff to an internal list
            // ultimately, clear the Loading placeholder and convert everything to DOM elements
        } catch (err) {
            Logger.error("Error fetching information for courses in common: ", err);
        }
    })();
}

modals.push(new Modal("user-courses-in-common-modal", "Courses In Common", createElement("div", [], {}, [
    createElement("div", ["splus-modal-contents"], {}, [
        createElement("ul", ["setting-entry"], { id: "user-courses-in-common-list" }, [])
    ])
]), "&copy; Aaron Opell, Glen Husman 2018", setCourseListModalContent));

document.querySelector("#user-courses-in-common-modal .close").onclick = modalClose;
