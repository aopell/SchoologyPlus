import { Logger } from "./logger";
import { Setting } from "./settings";

async function backgroundPageFetch(
    url: RequestInfo,
    init: RequestInit,
    bodyReadType: "json" | "text"
) {
    try {
        let response = await chrome.runtime.sendMessage({
            type: "fetch",
            url: url,
            params: init,
            bodyReadType: bodyReadType,
        });

        if (response === undefined || response === null) {
            Logger.error(
                "[backgroundPageFetch] Response is undefined or null",
                response,
                chrome.runtime.lastError
            );
            throw new Error(
                "Response is undefined or null. Last error: " + chrome.runtime.lastError
            );
        }

        response = JSON.parse(response);

        if (!response.success) {
            throw new Error(response.error);
        }

        delete response.success;

        let bodyReadError = response.bodyReadError;
        delete response.bodyReadError;

        let bodyContent = response[bodyReadType];
        let readBodyTask = new Promise((readBodyResolve, readBodyReject) => {
            if (bodyReadError) {
                if (bodyReadError === true) {
                    readBodyReject();
                } else {
                    readBodyReject({ status: response.status, bodyReadError: bodyReadError });
                }
            } else {
                readBodyResolve(bodyContent);
            }
        });
        response[bodyReadType] = () => readBodyTask;

        return response;
    } catch (error) {
        Logger.error("[backgroundPageFetch] Error occurred", error);
        throw error;
    }
}

/**
 * Creates a fetch function wrapper which honors a rate limit.
 *
 * @returns {(input: RequestInfo, init?: RequestInit)=>Promise<Response>} A function following the fetch contract.
 * @example
 * // 10 requests per 3 seconds
 * var rateLimitedFetch = createFetchRateLimitWrapper(10, 3000);
 * rateLimitedFetch("https://www.google.com/").then(x => Logger.log(x))
 * @param {number} requestsPerInterval The number of requests per time interval permitted by the rate limit.
 * @param {number} interval The amount of time, in milliseconds, that the rate limit is delineated in.
 */
function createFetchRateLimitWrapper(
    requestsPerInterval: number,
    interval: number
): (input: RequestInfo, init: RequestInit, bodyReadType: "json" | "text") => Promise<Response> {
    let callsThisCycle = 0;

    // array of resolve callbacks which trigger the request to be reenqueued
    let queue: (() => void)[] = [];

    function onIntervalReset() {
        callsThisCycle = 0;
        let countToDequeue = queue.length;
        if (countToDequeue) {
            Logger.log("Processing " + countToDequeue + " ratelimit-delayed queued requests");
        }
        for (let i = 0; i < countToDequeue; i++) {
            // note that this resolution might trigger stuff to be added to the queue again
            // that's why we store length before we iterate
            queue[i]();
        }
        // remove everything we just dequeued and executed
        queue.splice(0, countToDequeue);
    }

    function rateLimitedFetch(
        this: any,
        input: RequestInfo,
        init: RequestInit,
        bodyReadType: "json" | "text"
    ): Promise<Response> {
        if (callsThisCycle == 0) {
            setTimeout(onIntervalReset, interval);
        }

        if (callsThisCycle < requestsPerInterval) {
            callsThisCycle++;
            return backgroundPageFetch.apply(this, [input, init, bodyReadType]);
        } else {
            // enqueue the request
            // basically try again later
            let resolvePromiseFunc: () => void = () => {};

            let realThis = this;

            let returnPromise = new Promise<void>(resolve => {
                resolvePromiseFunc = resolve;
            }).then(() => rateLimitedFetch.apply(realThis, [input, init, bodyReadType]));

            queue.push(resolvePromiseFunc);

            return returnPromise;
        }
    }

    return rateLimitedFetch;
}

var preload_globallyCachedApiKeys: Promise<any[]> | any[] | null = null;
// real limit is 15/5s but we want to be conservative
var preload_schoologyPlusApiRateLimitedFetch = createFetchRateLimitWrapper(13, 5000);

/**
 * Fetches data from the Schoology API (v1).
 * @returns {Promise<Response>} The response object from the Schoology API.
 * @param {string} path The API path, e.g. "/sections/12345/assignments/12"
 */
export function fetchApi(path: string): Promise<Response> {
    return fetchWithApiAuthentication(`https://api.schoology.com/v1/${path}`);
}

/**
 * Fetches a URL with Schoology API authentication headers for the current user.
 * @returns {Promise<Response>}
 * @param {string} url The URL to fetch.
 * @param {Object.<string, string>} [baseObj] The base set of headers.
 * @param {boolean} [useRateLimit=true] Whether or not to use the internal Schoology API rate limit tracker. Defaults to true.
 * @param {string} [bodyReadType="json"] The method with which the body should be read.
 */
export async function fetchWithApiAuthentication(
    url: string,
    baseObj?: { [s: string]: string },
    useRateLimit: boolean = true,
    bodyReadType: "json" | "text" = "json"
): Promise<Response> {
    return await (useRateLimit ? preload_schoologyPlusApiRateLimitedFetch : backgroundPageFetch)(
        url,
        {
            headers: createApiAuthenticationHeaders(await getApiKeysInternal(), baseObj),
        },
        bodyReadType
    );
}

/**
 * Fetches and parses JSON data from the Schoology API (v1).
 * @returns {Promise<object>} The parsed response from the Schoology API.
 * @param {string} path The API path, e.g. "/sections/12345/assignments/12"
 */
export async function fetchApiJson(path: string): Promise<Record<string, any>> {
    let response;
    try {
        response = await fetchApi(path);
    } catch (err) {
        throw err;
    }
    if (!response.ok) {
        throw response;
    }
    return await response.json();
}

/** Attempts to return the reference to the cached API key data.
 * Otherwise, asynchronously pulls the requisite data from the DOM to retrieve this user's Schoology API key, reloading the page if need be.
 * @returns {Promise<string[]>} an array of 3 elements: the key, the secret, and the user ID.
 */
async function getApiKeysInternal(): Promise<string[]> {
    if (preload_globallyCachedApiKeys && Array.isArray(preload_globallyCachedApiKeys)) {
        // API key object exists (truthy) and is an array (load completed)
        return preload_globallyCachedApiKeys;
    } else if (preload_globallyCachedApiKeys && preload_globallyCachedApiKeys.then !== undefined) {
        // API key variable is a promise, which will resolve to have API keys
        // await it
        // we don't have to worry about variable reassignment because the callbacks set up when the fetch was started will do that
        return await preload_globallyCachedApiKeys;
    } else {
        // API keys not yet retrieved
        // retrieve them
        preload_globallyCachedApiKeys = getApiKeysDirect();
        let retrievedApiKeys = await preload_globallyCachedApiKeys;
        // add to cache
        preload_globallyCachedApiKeys = retrievedApiKeys;
        return preload_globallyCachedApiKeys;
    }
}

/**
 * Gets the current user's ID.
 */
export function getUserId(): number {
    try {
        const trackerFrame = document.querySelector<HTMLIFrameElement>(
            "iframe[src*=session-tracker]"
        );
        if (!trackerFrame) {
            throw new Error("Session tracker frame not found");
        }
        const params = new URLSearchParams(trackerFrame.src.split("?")[1]);
        return Number.parseInt(params.get("id")!);
    } catch (e) {
        Logger.warn("Failed to get user ID from session tracker, using backup", e);
        try {
            return JSON.parse(
                document.querySelector("script:not([type]):not([src])")!.textContent!.split("=")[1]
            ).props.user.uid;
        } catch (e2) {
            Logger.error("Failed to get user ID from backup method", e2);
            throw new Error(`Failed to get user ID from backup method: ${e2}`);
        }
    }
}

/**
 * Gets the user's API credentials from the Schoology API key webpage, bypassing the cache.
 */
async function getApiKeysDirect() {
    let apiKey = Setting.getValue("apikey");
    let apiSecret = Setting.getValue("apisecret");
    let apiUserId = Setting.getValue("apiuser");
    let currentUser = getUserId();
    let apiStatus = Setting.getValue("apistatus");

    if (apiStatus === "denied" && apiUserId === currentUser) {
        throw "apidenied";
    }

    if (apiKey && apiSecret && apiUserId === currentUser) {
        // API keys already exist
        return [apiKey, apiSecret, apiUserId];
    }

    // API keys do not exist
    throw "noapikey";
}

/**
 * Given an apiKeys array, generate the authentication headers for an API request.
 *
 * @param {string[]} apiKeys The apiKeys array, consisting of at least the key and the secret, returned from getApiKeys.
 * @param {Object.<string,any>} baseObj Optional: the base object from which to copy existing properties.
 * @returns {Object.<string,string>} A dictionary of HTTP headers, including a properly-constructed Authorization header for the given API user.
 */
function createApiAuthenticationHeaders(
    apiKeys: string[],
    baseObj?: { [s: string]: any }
): { [s: string]: string } {
    let retObj: { [s: string]: string } = {};
    if (baseObj) {
        Object.assign(retObj, baseObj);
    }

    let userAPIKey = apiKeys[0];
    let userAPISecret = apiKeys[1];

    retObj[
        "Authorization"
    ] = `OAuth realm="Schoology%20API",oauth_consumer_key="${userAPIKey}",oauth_signature_method="PLAINTEXT",oauth_timestamp="${Math.floor(
        Date.now() / 1000
    )}",oauth_nonce="${
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }",oauth_version="1.0",oauth_signature="${userAPISecret}%26"`;

    if (!retObj["Content-Type"]) {
        retObj["Content-Type"] = "application/json";
    }

    return retObj;
}
