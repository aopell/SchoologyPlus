(function () {
    const iframe = document.querySelector('.s-page-summary iframe');
    if (!iframe) return; // no iframe detected

    const pageTitle = document.querySelector('.s-page-title');
    const link = createElement("a", [], {
        href: iframe.src,
        title: 'Open in a new tab',
        target: '_blank',
        style: 'background: none; margin-top: 2px;'
    }, [pageTitle.cloneNode(true), createElement('span', [], {
        textContent: ' ⇨'
    })]);
    // turn span to link element
    pageTitle.replaceWith(link);

    link.href = processIframeSrc(link);
})();

function processIframeSrc(link) {
    // Google docs/sheets/slides
    if (link.host.match(/.*s\.google\.com/g)) {
        // yeah yeah you could do an extensive regex match OR you can just be lazy
        link.href = link.href.replace('/preview', '/edit');
        link.href = link.href.replace('pub?embedded=true', 'pub?embedded=false');
    }
    return link.href;
}

Logger.log("Loaded page script");