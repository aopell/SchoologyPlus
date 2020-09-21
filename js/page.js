(function() {
    const buttonWrapper = document.querySelector(".course-info-wrapper dl");
    const iframe = document.querySelector("iframe")
    let button = createButton("s-plus-course-options", "Open in new tab", () => {
        const url = processIframeSrc(iframe.src);
        chrome.runtime.sendMessage({type: "openURL", url});
    });
    let img = createSvgLogo();
    Object.assign(img.style, {
        verticalAlign: "middle",
        paddingLeft: "4px",
        width: "18px"
    });
    button.prepend(img);
    button.querySelector("input").style.paddingLeft = "4px";
    buttonWrapper.appendChild(button)
})();

function processIframeSrc(src) {
    // Google docs/sheets/slides
    src = src.replace('/preview','/edit');
    return src;
}

Logger.log("Loaded page script");