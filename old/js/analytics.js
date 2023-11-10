(async function () {
    // Wait for loader.js to finish running
    while (!window.splusLoaded) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    await loadDependencies("analytics", []);
})();

/**
 * Tracks an event using Google Analytics if the user did not opt out
 * NOTE: The Firefox version of the extension has no support for Google Analytics
 * @param {string} eventName The event name
 * @param {Object} param1 Event properties
 */
var trackEvent = function (eventName, {
    legacyTarget,
    legacyAction,
    legacyLabel = undefined,
    legacyValue = undefined,
    id,
    context,
    value,
    ...extraProps
} = {}) {
    console.debug("[S+] Tracking disabled by user", arguments);
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

    function getRandomToken() {
        // E.g. 8 * 32 = 256 bits token
        var randomPool = new Uint8Array(32);
        crypto.getRandomValues(randomPool);
        var hex = '';
        for (var i = 0; i < randomPool.length; ++i) {
            hex += randomPool[i].toString(16);
        }
        // E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
        return hex;
    }

    chrome.storage.sync.get({ analytics: getBrowser() === "Firefox" ? "disabled" : "enabled", theme: "<unset>", beta: "<unset>", newVersion: "<unset>" }, s => {
        if (s.analytics === "enabled") {
            chrome.storage.local.get({randomUserId: null}, l => {
                if (!l.randomUserId) {
                    let randomToken = getRandomToken();
                    chrome.storage.local.set({randomUserId: randomToken}, () => {
                        enableAnalytics(s.theme, s.beta, s.newVersion, randomToken);
                    });
                } else {
                    enableAnalytics(s.theme, s.beta, s.newVersion, l.randomUserId);
                }
            });
        }
    });

    function enableAnalytics(selectedTheme, beta, newVersion, randomUserId) {
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

        // Google Analytics v4
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());

        gtag('config', 'G-YM6B00RDYC', {
            page_location: location.href.replace(/\/\d{3,}\b/g, "/*"),
            page_path: location.pathname.replace(/\/\d{3,}\b/g, "/*"),
            page_title: null,
            user_id: randomUserId,
            user_properties: {
                extensionVersion: chrome.runtime.getManifest().version,
                domain: location.host,
                theme: selectedTheme,
                modernTheme: document.documentElement.getAttribute("modern"),
                activeBeta: beta,
                lastEnabledVersion: newVersion,
            }
        });

        let trackEventOld = function (target, action, label = undefined, value = undefined) {
            ga('send', 'event', target, action, label, value);
            console.debug(`[S+] Tracked event [OLD]:`, { target, action, label, value });
        };

        trackEvent = function (eventName, {
            legacyTarget,
            legacyAction,
            legacyLabel = undefined,
            legacyValue = undefined,
            id,
            context,
            value,
            ...extraProps
        } = {}) {
            trackEventOld(legacyTarget, legacyAction, legacyLabel, legacyValue);
            let eventData = {
                id,
                context,
                value,
                ...extraProps
            };
            console.debug(`[S+] Tracked event:`, eventName, eventData);
            gtag("event", eventName, eventData);
        };

        function trackClick(event) {
            if (!event.isTrusted) return;
            let target = event.currentTarget || event.target;

            trackEvent("tracking_link_click", {
                legacyTarget: target.dataset.splusTrackingId || target.id || "Unlabeled Button",
                legacyAction: "click",
                legacyLabel: target.dataset.splusTrackingContext || "Tracking Link",
                legacyValue: target.dataset.splusTrackingValue || event.button,
                id: target.dataset.splusTrackingId || target.id || "Unlabeled Button",
                context: target.dataset.splusTrackingContext || "Tracking Link",
                value: target.dataset.splusTrackingValue,
            });
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