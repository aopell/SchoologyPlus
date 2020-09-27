// Adds an "Open in New Tab" link to /page pages which simply embed something.
(function () {
    const iframe = document.querySelector('.s-page-summary iframe');
    if (!iframe) return; // no iframe detected

    const pageTitle = document.querySelector('.s-page-title');
    const link = createElement("a", [], {
        href: iframe.src,
        title: 'Open in a new tab',
        target: '_blank',
        style: 'background: none;' // clear assignment icon
    }, [pageTitle.cloneNode(true), createElement('span', [], {
        textContent: ' ⇨'
    })]);
    // turn span to link element
    pageTitle.replaceWith(link);

    link.href = processIframeSrc(link.href);
})();

function processIframeSrc(rawLink) {
    let link = new URL(rawLink);
    // Google docs/sheets/slides
    if (link.host.match(/.*s\.google\.com/g)) {
        // convert preview to edit
        link.pathname = link.pathname.replace(/\/preview(\/?)$/, "/edit");
        // remove embedded param
        link.searchParams.delete('embedded');
    }
    return link.href;
}

Logger.log("Loaded page script");