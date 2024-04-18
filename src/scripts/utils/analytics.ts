import { getBrowser } from "./dom";

// TODO: https://developer.chrome.com/docs/extensions/how-to/integrate/google-analytics-4#toc-tracking-pageviews

interface AnalyticsEventProps {
    legacyTarget?: string;
    legacyAction?: string;
    legacyLabel?: string;
    legacyValue?: string;
    id?: string;
    context?: string;
    value?: string;

    [key: string]: any;
}

/**
 * Tracks an event using Google Analytics if the user did not opt out
 * NOTE: The Firefox version of the extension has no support for Google Analytics
 */
export var trackEvent = function (
    eventName: string,
    {
        legacyTarget,
        legacyAction,
        legacyLabel = undefined,
        legacyValue = undefined,
        id,
        context,
        value,
        ...extraProps
    }: AnalyticsEventProps = {}
): void {
    console.debug("[S+] Tracking disabled by user", arguments);
};

export async function getAnalyticsUserId() {
    function getRandomToken() {
        // E.g. 8 * 32 = 256 bits token
        var randomPool = new Uint8Array(32);
        crypto.getRandomValues(randomPool);
        var hex = "";
        for (var i = 0; i < randomPool.length; ++i) {
            hex += randomPool[i].toString(16);
        }
        // E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
        return hex;
    }

    let l: { randomUserId?: string } = await chrome.storage.local.get({ randomUserId: null });

    if (!l.randomUserId) {
        let randomUserId = getRandomToken();
        await chrome.storage.local.set({ randomUserId });
        return randomUserId;
    }

    return l.randomUserId;
}

export async function initializeAnalytics({
    documentContext,
    isAnalyticsEnabled,
    selectedTheme,
    selectedBeta,
    currentVersion,
    newVersion,
    randomUserId,
    themeIsModern,
}: {
    documentContext: boolean;
    isAnalyticsEnabled: boolean;
    selectedTheme: string | null;
    selectedBeta: string | null;
    currentVersion: string;
    newVersion: string;
    randomUserId: string;
    themeIsModern: string;
}) {
    if (isAnalyticsEnabled) {
        enableAnalytics();
    }

    function enableAnalytics() {
        // Google Analytics v4

        (globalThis as any).dataLayer = (globalThis as any).dataLayer || [];

        function gtag(...args: any[]) {
            (globalThis as any).dataLayer?.push(arguments);
        }

        gtag("js", new Date());

        const gtagConfig = {
            page_location: location.href.replace(/\/\d{3,}\b/g, "/*"),
            page_path: location.pathname.replace(/\/\d{3,}\b/g, "/*"),
            page_title: null,
            user_id: randomUserId,
            user_properties: {
                theme: selectedTheme,
                activeBeta: selectedBeta,
                lastEnabledVersion: newVersion,
                extensionVersion: currentVersion,
                domain: location.host,
                modernTheme: themeIsModern,
            },
        };

        gtag("config", "G-YM6B00RDYC", gtagConfig);

        trackEvent = function (
            eventName,
            {
                legacyTarget,
                legacyAction,
                legacyLabel = undefined,
                legacyValue = undefined,
                id,
                context,
                value,
                ...extraProps
            } = {}
        ) {
            let eventData = {
                id,
                context,
                value,
                ...extraProps,
            };
            console.debug(`[S+] Tracked event:`, eventName, eventData);
            gtag("event", eventName, eventData);
        };

        function trackClick(event: Event & { button?: string }) {
            if (!event.isTrusted) return;
            let target = (event.currentTarget || event.target) as HTMLElement;

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

        if (documentContext) {
            let trackedElements = new Set();
            let observer = new MutationObserver((mutations, mutationObserver) => {
                for (let elem of document.querySelectorAll(
                    ".splus-track-clicks:not(.splus-tracked)"
                )) {
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
                    subtree: true,
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
    }
}
