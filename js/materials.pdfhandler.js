// this script runs in page DOM context, i.e. not as a content script
// ignoring the fact that this is an awful hack, this script is exclusively responsible for document tooltips

(async function () {
    // subbed in from content script
    // let documentInfoFromApi = { ... };
    /* SUBSTITUTE_API_DOCUMENT_INFO */
    // let documentUrlsFromApi = { ... };
    /* SUBSTITUTE_API_DOCUMENT_URLS */

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
            console.log("document load hook triggered.");
        };
    });

    for (let docToLoad in documentLoadHooks) {
        // we can't do API requests here (CORS), so we pass in info from the content script
        let apiMetadata = documentInfoFromApi[docToLoad];

        console.log(apiMetadata);

        if (documentUrlsFromApi[docToLoad]) {
            let pdf = await pdfjsLib.getDocument(documentUrlsFromApi[docToLoad]);
            await documentLoadHooks[docToLoad](apiMetadata, pdf);
        } else {
            await documentLoadHooks[docToLoad](apiMetadata, null);
        }
    }
})();