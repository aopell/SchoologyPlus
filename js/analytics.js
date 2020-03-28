/**
 * Tracks an event using Google Analytics if the user did not opt out
 * @param {string} target The target of the event
 * @param {string} action The action of the event
 * @param {string} [label] Used to group related events
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

    chrome.storage.sync.get({ analytics: getBrowser() === "Firefox" ? "disabled" : "enabled" }, s => {
        if (s.analytics === "enabled") {
            enableAnalytics();
        }
    });

    function enableAnalytics() {
        (function (i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r; i[r] = i[r] || function () {
                (i[r].q = i[r].q || []).push(arguments)
            }, i[r].l = 1 * new Date();
        })(window, undefined, undefined, undefined, 'ga');

        ga('create', 'UA-55873395-2', 'auto');
        ga('set', 'checkProtocolTask', null); // Disable file protocol checking.
        ga('set', 'dimension1', chrome.runtime.getManifest().version);
        ga('set', 'dimension2', location.host);
        ga('send', 'pageview');

        trackEvent = function (target, action, label = undefined, value = undefined) {
            ga('send', 'event', target, action, label, value);
            console.debug(`[S+] Tracked event:`, { target, action, label, value });
        };

        function trackClick(event) {
            let target = event.currentTarget || event.target;
            trackEvent(target.dataset.splusTrackingTarget || target.id || "Unlabeled Button", "click", target.dataset.splusTrackingLabel, target.dataset.splusTrackingValue);
        }

        let trackedElements = new Set();
        let observer = new MutationObserver((mutations, mutationObserver) => {
            for (let m of mutations) {
                for (let n of m.addedNodes) {
                    if (n.classList && n.classList.contains("splus-track-clicks") && !trackedElements.has(n)) {
                        n.addEventListener("click", trackClick);
                        trackedElements.add(n);
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        var readyStateCheckInterval = setInterval(function () {
            if (document.readyState === "complete") {
                clearInterval(readyStateCheckInterval);
                init();
            }
        }, 10);

        function init() {
            for (let elem of document.querySelectorAll(".splus-track-clicks")) {
                if (!trackedElements.has(elem)) {
                    elem.addEventListener("click", trackClick);
                    trackedElements.add(elem);
                }
            }
        }
    }
})();