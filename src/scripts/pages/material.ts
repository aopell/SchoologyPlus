import { createButtonWithLogo } from "../utils/dom";
import { Logger } from "../utils/logger";

export async function load() {
    try {
        await showPreviewPdfInBrowserButton();
    } catch (reason) {
        Logger.error("Error running material page modification script: ", reason);
    }
}

async function showPreviewPdfInBrowserButton() {
    let pdfMaterialLink = document.querySelector<HTMLAnchorElement>(
        "#content-wrapper .attachments .attachments-file-name a[href$='.pdf']"
    );

    if (!pdfMaterialLink) {
        return;
    }

    let buttonClickAction = async () => {
        let pdfUrl = pdfMaterialLink.href;
        await chrome.runtime.sendMessage({
            type: "declarativeNetRequestRuleset",
            action: "enable",
            rulesetId: "pdf_preview_ruleset",
        });
        window.open(pdfUrl, "_blank");
        setTimeout(() => {
            chrome.runtime.sendMessage({
                type: "declarativeNetRequestRuleset",
                action: "disable",
                rulesetId: "pdf_preview_ruleset",
            });
        }, 5000);
    };

    let previewButton = createButtonWithLogo(
        "splus-preview-pdf-button",
        "Preview PDF in Browser's Viewer",
        buttonClickAction
    );

    let previewButton2 = createButtonWithLogo(
        "splus-preview-pdf-button-lower",
        "Preview PDF in Browser's Viewer",
        buttonClickAction
    );

    let buttonContainer = document.querySelector("#center-top .content-top-wrapper");
    buttonContainer?.appendChild(previewButton);

    let buttonContainer2 = document.querySelector(
        "#content-wrapper .attachments .attachments-files"
    );
    buttonContainer2?.appendChild(previewButton2);
}
