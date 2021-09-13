(async function() {
    // Wait for loader.js to finish running
    while (!window.splusLoaded) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    await loadDependencies("analytics", []);
})();

/**
 * Tracks an event using Google Analytics if the user did not opt out
 * NOTE: The Firefox version of the extension has no support for Google Analytics
 * @param {string} target (Event Category) The target of the event
 * @param {string} action (Event Action) The action of the event
 * @param {string} [label] (Event Label) Used to group related events
 * @param {number} [value] Numeric value associated with the event
 */
var trackEvent = function (target, action, label = undefined, value = undefined) {
    console.debug("[S+] Tracking disabled by user", { target, action, label, value });
};

(function () {
    function getBrowser() {
        if (typeof chrome !== "undefined") {
            if (typeof browser !== "undefined") {
                return "Firefox";
            } else {
                return "Chrome";
            }
        } else {
            // Does not actually differentiate Chrome and Edge, since new Edge is Chromium
            return "Other";
        }
    }

    chrome.storage.sync.get({ analytics: getBrowser() === "Firefox" ? "disabled" : "enabled", theme: "<unset>", beta: "<unset>", newVersion: "<unset>" }, s => {
        if (s.analytics === "enabled") {
            enableAnalytics(s.theme, s.beta, s.newVersion);
        }
    });

    function enableAnalytics(selectedTheme, beta, newVersion) {
        // isogram
        let r = 'ga';
        window['GoogleAnalyticsObject'] = r;
        window[r] = window[r] || function () {
            window[r].q = window[r].q || [];
            window[r].q.push(arguments);
        };
        window[r].l = 1 * new Date();

        ga('create', 'UA-55873395-2', 'auto');
        ga('set', 'checkProtocolTask', null); // Disable file protocol checking.
        ga('set', 'dimension1', chrome.runtime.getManifest().version);
        ga('set', 'dimension2', location.host);
        ga('set', 'dimension3', selectedTheme);
        ga('set', 'dimension4', document.documentElement.getAttribute("modern"));
        ga('set', 'dimension5', beta);
        ga('set', 'dimension6', newVersion);
        ga('send', 'pageview', location.pathname.replace(/\/\d{3,}\b/g, "/*") + location.search);

        trackEvent = function (target, action, label = undefined, value = undefined) {
            ga('send', 'event', target, action, label, value);
            console.debug(`[S+] Tracked event:`, { target, action, label, value });
        };

        function trackClick(event) {
            if(!event.isTrusted) return;
            let target = event.currentTarget || event.target;
            trackEvent(target.dataset.splusTrackingTarget || target.id || "Unlabeled Button", "click", target.dataset.splusTrackingLabel || "Tracking Link", target.dataset.splusTrackingValue || event.button);
        }

        let trackedElements = new Set();
        let observer = new MutationObserver((mutations, mutationObserver) => {
            for (let elem of document.querySelectorAll(".splus-track-clicks:not(.splus-tracked)")) {
                if (!trackedElements.has(elem)) {
                    elem.addEventListener("click", trackClick);
                    elem.addEventListener("auxclick", trackClick);
                    elem.classList.add("splus-tracked");
                    trackedElements.add(elem);
                }
            }
        });

        var readyStateCheckInterval = setInterval(function () {
            if (document.readyState === "complete") {
                clearInterval(readyStateCheckInterval);
                init();
            }
        }, 10);

        function init() {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            for (let elem of document.querySelectorAll(".splus-track-clicks")) {
                if (!trackedElements.has(elem)) {
                    elem.addEventListener("click", trackClick);
                    elem.addEventListener("auxclick", trackClick);
                    elem.classList.add("splus-tracked");
                    trackedElements.add(elem);
                }
            }
        }
    }
})();