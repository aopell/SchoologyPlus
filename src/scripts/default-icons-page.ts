import M from "materialize-css";

import { DEFAULT_ICONS } from "./utils/default-icons";

const MAX_CHARS = 40;

let container = document.getElementById("icons-container") as HTMLElement;
let textbox = document.getElementById("icon-test-text") as HTMLInputElement;
textbox.addEventListener("input", e => displayFilteredIcons((e.target as HTMLInputElement).value));
textbox.addEventListener(
    "dblclick",
    e => ((e.target as HTMLInputElement).value = "") || displayFilteredIcons()
);
let toggle = document.getElementById("toggle") as HTMLAnchorElement;
toggle.addEventListener("click", e => toggleCondensed());
let toggleIcon = document.getElementById("toggle-icon") as HTMLElement;
displayFilteredIcons();
M.Tooltip.init(document.querySelectorAll<HTMLElement>(".tooltipped"), {
    outDuration: 0,
    inDuration: 300,
    enterDelay: 0,
    exitDelay: 10,
});

function toggleCondensed() {
    if (document.body.classList.contains("condensed")) {
        toggleIcon.textContent = "toggle_off";
    } else {
        toggleIcon.textContent = "toggle_on";
    }
    document.body.classList.toggle("condensed");
}

function createIconPreview(icon: { regex: string; source: string; url: string }, i: number) {
    let div = document.createElement("div");
    div.classList.add("icon-preview", "col", "s6", "m3", "l2", "xl1", "center");
    div.title = `#${i}\n${icon.regex}`;
    let img = document.createElement("img");
    img.dataset.index = i.toString();
    img.classList.add("col", "s12");
    img.src = icon.url;
    img.addEventListener("click", iconClick);
    let code = document.createElement("code");
    if (icon.regex.length > MAX_CHARS) {
        code.textContent = icon.regex.substr(0, MAX_CHARS - 3) + "...";
    } else {
        code.textContent = icon.regex;
    }
    code.classList.add("col", "s12");
    let a = document.createElement("a");
    a.href = `https://www.flaticon.com/free-icon/${icon.source}`;
    a.target = "_blank";
    a.textContent = `#${i}`;
    a.classList.add("col", "s12");
    div.appendChild(img);
    div.appendChild(a);
    div.appendChild(code);
    return div;
}

function displayFilteredIcons(text = "") {
    container.innerHTML = "";

    let matchResult = text.match(/#(\d+)/);
    let m = matchResult ? Number.parseFloat(matchResult[1]) : false;

    if (m && m <= DEFAULT_ICONS.length) {
        container.appendChild(createIconPreview(DEFAULT_ICONS[m - 1], m));
        return;
    }

    let i = 0;
    for (let icon of DEFAULT_ICONS) {
        i++;
        if (text !== "" && !text.match(new RegExp(icon.regex, "i"))) continue;
        container.appendChild(createIconPreview(icon, i));
    }
}

function iconClick(e: Event) {
    let indx = +(e.target as HTMLElement).dataset.index!;
    textbox.value = `#${indx}`;
    displayFilteredIcons(textbox.value);
    if (document.body.classList.contains("condensed")) {
        toggleCondensed();
    }
}
