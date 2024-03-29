import { trackEvent } from "./analytics.js";
import { Setting, updateSettings } from "./settings.js";

export default class Modal {
    id: string;
    element: HTMLElement;
    body: HTMLElement;
    onopen: (modal: Modal, options?: any) => void;

    static modals: Modal[] = [];

    constructor(
        id: string,
        title: string,
        contentElement: HTMLElement,
        footerHTML: string,
        openCallback: (modal: Modal, options: any) => void
    ) {
        let modalHTML =
            `<div id="${id}" class="splus-modal"><div class="splus-modal-content"><div class="splus-modal-header"><span class="close" data-parent="${id}">&times;</span>` +
            `<p class="splus-modal-title">${title}</p></div><div class="splus-modal-body"></div><div class="splus-modal-footer"><p class="splus-modal-footer-text">` +
            `${footerHTML}</p></div></div></div>`;

        document.body.appendChild(document.createElement("div")).innerHTML = modalHTML;

        this.id = id;
        this.element = document.getElementById(id)!;
        this.body = this.element.querySelector(".splus-modal-body")!;
        this.onopen = openCallback;

        this.body.appendChild(contentElement);
    }

    static openModal(id: string, options?: any) {
        for (let m of Modal.modals) {
            Modal.modalClose(m.element);
        }

        trackEvent("perform_action", {
            id: "open",
            context: "Modal",
            value: id,
            legacyTarget: id,
            legacyAction: "open",
            legacyLabel: "Modal",
        });

        let mm = Modal.modals.find(m => m.id == id);
        if (mm) {
            if (mm.onopen) mm.onopen(mm, options);
            mm.element.style.display = "block";
            document.documentElement.classList.add("splus-modal-open");
        }
    }

    static modalClose(element: HTMLElement) {
        // element = element.target ? document.getElementById(element.target.dataset.parent) : element;

        if (
            element.id === "settings-modal" &&
            element.style.display !== "none" &&
            Setting.anyModified()
        ) {
            if (!confirm("You have unsaved settings.\nAre you sure you want to exit?")) return;
            updateSettings();
        } else if (
            element.id === "choose-theme-modal" &&
            element.style.display === "block" &&
            !localStorage.getItem("splus-temp-theme-chosen")
        ) {
            alert("Please use the 'Select' button to confirm your choice.");
            return;
        }

        element.style.display = "none";
        document.documentElement.classList.remove("splus-modal-open");
    }
}
