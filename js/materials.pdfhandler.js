// this script runs in page DOM context, i.e. not as a content script
// ignoring the fact that this is an awful hack, this script is exclusively responsible for document tooltips

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

    // document tooltips
    $("#course-profile-materials tr.type-document").each(async function (index, value) {
        let loadedText = "Loading...";
        // title already has a tooltip (full filename), so we'll use the filesize instead
        $(value).find(".attachments-file-name .attachments-file-size").tipsy({ gravity: "w", html: true, title: () => loadedText });

        let materialId = value.id.match(/\d+/)[0];
        documentLoadHooks[materialId] = async function (apiData, pdf) {
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

            loadedText = wrapHtml(body, "div", { class: "schoologyplus-tooltip document-tooltip" });
        };
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
})();