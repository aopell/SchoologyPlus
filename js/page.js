(function() {
    const iframeWrapper = document.querySelector(".s-page-summary");
    const iframe = iframeWrapper.querySelector('iframe');
    console.log(iframe,'--')
    if (!iframe) return; // no iframe detected

    let iframeURL = processIframeSrc(iframe.src);
    const link = createElement("a", ["splus-modal-button"], {
        textContent: "Open in new tab",
        href: iframe.src,
        target: '_blank'
    });
    if (link.host.match(/.*s\.google\.com/g)) {
        // yeah yeah you could do an extensive regex match OR you can just be lazy
        link.href = link.href.replace('/preview','/edit');
        link.href = link.href.replace('pub?embedded=true', 'pub?embedded=false');
    }
    iframeWrapper.appendChild(createElement('p',[],{},[link]));
})();

function processIframeSrc(src) {
    // Google docs/sheets/slides
    src = src.replace('/preview','/edit');
    return src;
}

Logger.log("Loaded page script");