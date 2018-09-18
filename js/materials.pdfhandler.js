// this script runs in page DOM context, i.e. not as a content script
// ignoring the fact that this is an awful hack, this script is exclusively responsible for document tooltips

"use strict";

(async function () {
    // subbed in from content script
    // let documentInfoFromApi = { ... };
    /* SUBSTITUTE_API_DOCUMENT_INFO */
    // let documentUrlsFromApi = { ... };
    /* SUBSTITUTE_API_DOCUMENT_URLS */
    // utility function definitions: escapeForHtml, wrapHtml
    /* SUBSTITUTE_HTML_BUILDER_UTIL */

    // Loaded via <script> tag, create shortcut to access PDF.js exports.
    var pdfjsLib = window["pdfjs-dist/build/pdf"];

    // The workerSrc property shall be specified.
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.0.550/pdf.worker.js";

    let documentLoadHooks = {};

    function processDocument(loadedTextHolder, onLoadHookRegister) {
        let value = document.getElementById(loadedTextHolder.dataset.domElementId);

        let materialId = value.id.match(/\d+/)[0];
        onLoadHookRegister(materialId, async function (apiData, pdf) {
            let body = "";
            if (!pdf) {
                body = wrapHtml("Error", "span", { class: "error-message" });
            } else {
                body += `<div class="preview-canvas-wrapper"><canvas id="preview-canvas-${materialId}" data-document-id="${materialId}" class="preview-canvas" /></div>`;
                body += wrapHtml(`${pdf.numPages} page${pdf.numPages == 1 ? "" : "s"}`, "p", { class: "page-count-summary" });

                // render master canvas
                let previewPage = await pdf.getPage(1);
                let masterCanvas = document.createElement("canvas");
                masterCanvas.id = "master-canvas-" + materialId;
                masterCanvas.classList.add("schoologyplus-master-canvas");
                let context = masterCanvas.getContext("2d");

                let initViewport = previewPage.getViewport(1);
                var scale = 100 / initViewport.width; // desired width / real width
                var viewport = previewPage.getViewport(scale);

                masterCanvas.width = viewport.width;
                masterCanvas.height = viewport.height;

                await previewPage.render({
                    canvasContext: context,
                    viewport: viewport
                });

                document.body.appendChild(masterCanvas);
            }

            loadedTextHolder.dataset.tooltipHtml = wrapHtml(body, "div", { class: "schoologyplus-tooltip document-tooltip" });
        });
    }

    // document tooltips
    // passes information to content script, which actually manages the tooltip
    $("#schoologyplus-material-tooltip-data-container .type-document").each(function (index, value) {
        processDocument(value, function (materialId, func) { documentLoadHooks[materialId] = func; });
    });

    let tooltipCreateObserver = new MutationObserver(mutations => {
        for (let i = 0; i < mutations.length; ++i) {
            for (let j = 0; j < mutations[i].addedNodes.length; ++j) {
                if (mutations[i].addedNodes[j].tagName == "DIV" && mutations[i].addedNodes[j].classList.contains("tipsy")) {
                    // candidate
                    let tipsyDiv = mutations[i].addedNodes[j];
                    let slaveCanvas = tipsyDiv.querySelector(".preview-canvas");
                    if (slaveCanvas && slaveCanvas.dataset.documentId) {
                        // clone master canvas
                        let masterCanvas = document.getElementById("master-canvas-" + slaveCanvas.dataset.documentId);

                        if (!masterCanvas) {
                            continue;
                        }

                        let slaveContext = slaveCanvas.getContext("2d");
                        slaveCanvas.width = masterCanvas.width;
                        slaveCanvas.height = masterCanvas.height;
                        slaveContext.drawImage(masterCanvas, 0, 0);
                    }
                }
            }
        }
    });

    let tooltipInfoCreateObserver = new MutationObserver(mutations => {
        for (let i = 0; i < mutations.length; ++i) {
            for (let j = 0; j < mutations[i].addedNodes.length; ++j) {
                let thisNode = mutations[i].addedNodes[j];
                if (!thisNode.dataset.domElementId || !document.getElementById(thisNode.dataset.domElementId) || !thisNode.classList.contains("type-document")) {
                    continue;
                }
                processDocument(thisNode, async function (materialId, callback) {
                    await callback(JSON.parse(thisNode.dataset.docInfo), thisNode.dataset.docUrl ? await pdfjsLib.getDocument(thisNode.dataset.docUrl) : null);
                });
            }
        }
    });

    for (let docToLoad in documentLoadHooks) {
        // we can't do API requests here (CORS), so we pass in info from the content script
        let apiMetadata = documentInfoFromApi[docToLoad];

        if (documentUrlsFromApi[docToLoad]) {
            let pdf = await pdfjsLib.getDocument(documentUrlsFromApi[docToLoad]);
            await documentLoadHooks[docToLoad](apiMetadata, pdf);
        } else {
            await documentLoadHooks[docToLoad](apiMetadata, null);
        }
    }

    tooltipCreateObserver.observe(document.body, {
        subtree: false,
        childList: true
    });

    tooltipInfoCreateObserver.observe(document.getElementById("schoologyplus-material-tooltip-data-container"), {
        subtree: false,
        childList: true
    });
})().catch(rej => {
    console.error("Error occurred in materials.pdfhandler injected code: %o", rej);
});