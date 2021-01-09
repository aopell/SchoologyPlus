// Adapted from https://github.com/fregante/webext-patterns
// Used and modified with permission of the MIT License
// BEGIN https://github.com/fregante/webext-patterns

// Copied from https://github.com/mozilla/gecko-dev/blob/073cc24f53d0cf31403121d768812146e597cc9d/toolkit/components/extensions/schemas/manifest.json#L487-L491
const patternValidationRegex = /^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^*/]+|[^*/]+)\/.*$|^file:\/\/\/.*$|^resource:\/\/(\*|\*\.[^*/]+|[^*/]+)\/.*$|^about:/;

function getRawRegex(matchPattern) {
    if (!patternValidationRegex.test(matchPattern)) {
        throw new Error(matchPattern + ' is an invalid pattern, it must match ' + String(patternValidationRegex));
    }

    let [, protocol, host, pathname] = matchPattern.split(/(^[^:]+:[/][/])([^/]+)?/);

    protocol = protocol
        .replace('*', 'https?') // Protocol wildcard
        .replace(/[/]/g, '[/]'); // Escape slashes

    host = (host ?? '') // Undefined for file:///
        .replace(/^[*][.]/, '([^/]+.)*') // Initial wildcard
        .replace(/^[*]$/, '[^/]+') // Only wildcard
        .replace(/[.]/g, '[.]') // Escape dots
        .replace(/[*]$/g, '[^.]+'); // Last wildcard

    pathname = pathname
        .replace(/[/]/g, '[/]') // Escape slashes
        .replace(/[.]/g, '[.]') // Escape dots
        .replace(/[*]/g, '.*'); // Any wildcard

    return '^' + protocol + host + '(' + pathname + ')?$';
}

function patternToRegex(...matchPatterns) {
    return new RegExp(matchPatterns.map(getRawRegex).join('|'));
}

// END https://github.com/fregante/webext-patterns

// Adapted from https://github.com/fregante/webext-additional-permissions
// Used and modified with permission of the MIT License
// BEGIN https://github.com/fregante/webext-additional-permissions

// This is the default because it’s easier to explain that both exports are synchronous, while still offering a `*Sync()` version where possible.
async function getManifestPermissions() {
    return getManifestPermissionsSync();
}

function getManifestPermissionsSync() {
    const manifest = chrome.runtime.getManifest();
    const manifestPermissions = {
        origins: [],
        permissions: []
    };

    const list = new Set([
        ...(manifest.permissions ?? []),
        ...(manifest.content_scripts ?? []).flatMap(config => config.matches ?? [])
    ]);

    for (const permission of list) {
        if (permission.includes('://')) {
            manifestPermissions.origins.push(permission);
        } else {
            manifestPermissions.permissions.push(permission);
        }
    }

    return manifestPermissions;
}

const hostRegex = /:[/][/]([^/]+)/;
function parseDomain(origin) {
    return origin
        // Extract host
        .split(hostRegex)[1]

        // Discard anything but the first- and second-level domains
        .split('.')
        .slice(-2)
        .join('.');
}

async function getAdditionalPermissions({ strictOrigins = true } = {}) {
    const manifestPermissions = getManifestPermissionsSync();

    return new Promise(resolve => {
        chrome.permissions.getAll(currentPermissions => {
            const additionalPermissions = {
                origins: [],
                permissions: []
            };

            for (const origin of currentPermissions.origins ?? []) {
                if (manifestPermissions.origins.includes(origin)) {
                    continue;
                }

                if (!strictOrigins) {
                    const domain = parseDomain(origin);
                    const isDomainInManifest = manifestPermissions.origins
                        .some(manifestOrigin => parseDomain(manifestOrigin) === domain);

                    if (isDomainInManifest) {
                        continue;
                    }
                }

                additionalPermissions.origins.push(origin);
            }

            for (const permission of currentPermissions.permissions ?? []) {
                if (!manifestPermissions.permissions.includes(permission)) {
                    additionalPermissions.permissions.push(permission);
                }
            }

            resolve(additionalPermissions);
        });
    });
}

// END https://github.com/fregante/webext-additional-permissions

// Adapted from https://github.com/fregante/webext-domain-permission-toggle
// Used and modified with permission of the MIT License
// BEGIN https://github.com/fregante/webext-domain-permission-toggle

const contextMenuId = 'webext-domain-permission-toggle:add-permission';
let currentTabId;
let globalOptions;

async function p(namespace, function_, ...args) {
    if (window.browser) {
        // @ts-expect-error
        return browser[namespace][function_](...args);
    }

    return new Promise((resolve, reject) => {
        // @ts-expect-error
        chrome[namespace][function_](...args, result => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}

async function executeCode(tabId, function_, ...args) {
    return p('tabs', 'executeScript', tabId, {
        code: `(${function_.toString()})(...${JSON.stringify(args)})`
    });
}

async function isOriginPermanentlyAllowed(origin) {
    return p('permissions', 'contains', {
        origins: [
            origin + '/*'
        ]
    });
}

function createMenu() {
    chrome.contextMenus.remove(contextMenuId, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
        id: contextMenuId,
        type: 'checkbox',
        checked: false,
        title: globalOptions.title,
        contexts: [
            'page_action',
            'browser_action'
        ],

        // Note: This is completely ignored by Chrome and Safari. Great.
        // TODO: Read directly from manifest and verify that the requested URL matches
        documentUrlPatterns: [
            'http://*/*',
            'https://*/*'
        ]
    });
}

function updateItem({ tabId }) {
    chrome.tabs.executeScript(tabId, {
        code: 'location.origin'
    }, async ([origin] = []) => {
        const settings = {
            checked: false,
            enabled: true
        };
        if (!chrome.runtime.lastError && origin) {
            // Manifest permissions can't be removed; this disables the toggle on those domains
            const manifestPermissions = await getManifestPermissions();
            const isDefault = manifestPermissions.origins.some(permission => permission.startsWith(origin));
            settings.enabled = !isDefault;

            // We might have temporary permission as part of `activeTab`, so it needs to be properly checked
            settings.checked = isDefault || await isOriginPermanentlyAllowed(origin);
        }

        chrome.contextMenus.update(contextMenuId, settings);
    });
}

async function togglePermission(tab, toggle) {
    // Don't use non-ASCII characters because Safari breaks the encoding in executeScript.code
    const safariError = 'The browser didn\'t supply any information about the active tab.';
    if (!tab.url && toggle) {
        throw new Error(`Please try again. ${safariError}`);
    }

    if (!tab.url && !toggle) {
        throw new Error(`Couldn't disable the extension on the current tab. ${safariError}`);
    }

    const permissionData = {
        origins: [
            new URL(tab.url).origin + '/*'
        ]
    };

    if (!toggle) {
        return p('permissions', 'remove', permissionData);
    }

    const userAccepted = await p('permissions', 'request', permissionData);
    if (!userAccepted) {
        chrome.contextMenus.update(contextMenuId, {
            checked: false
        });
        return;
    }

    if (globalOptions.reloadOnSuccess) {
        void executeCode(tab.id, (message) => {
            if (confirm(message)) {
                location.reload();
            }
        }, globalOptions.reloadOnSuccess);
    }
}

async function handleClick({ checked, menuItemId }, tab) {
    if (menuItemId !== contextMenuId) {
        return;
    }

    try {
        await togglePermission(tab, checked);
    } catch (error) {
        if (tab?.id) {
            executeCode(tab.id, 'alert' /* Can't pass a raw native function */, String(error)).catch(() => {
                alert(error); // One last attempt
            });
            updateItem({ tabId: tab.id });
        }

        throw error;
    }
}

/**
 * Adds an item to the browser action icon's context menu.
 * The user can access this menu by right clicking the icon. If your extension doesn't have any action or
 * popup assigned to the icon, it will also appear with a left click.
 *
 * @param options {Options}
 */
function addDomainPermissionToggle(options) {
    if (globalOptions) {
        throw new Error('webext-domain-permission-toggle can only be initialized once');
    }

    const { name } = chrome.runtime.getManifest();
    globalOptions = {
        title: `Enable ${name} on this domain`,
        reloadOnSuccess: `Do you want to reload this page to apply ${name}?`, ...options
    };

    chrome.contextMenus.onClicked.addListener(handleClick);
    chrome.tabs.onActivated.addListener(updateItem);
    chrome.tabs.onUpdated.addListener((tabId, { status }) => {
        if (currentTabId === tabId && status === 'complete') {
            updateItem({ tabId });
        }
    });

    createMenu();
}

// END https://github.com/fregante/webext-domain-permission-toggle

// Adapted from https://github.com/fregante/content-scripts-register-polyfill
// Used and modified with permission of the MIT License
// BEGIN https://github.com/fregante/content-scripts-register-polyfill

async function p_(fn, ...args) {
    return new Promise((resolve, reject) => {
        // @ts-expect-error
        fn(...args, result => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}

async function isOriginPermitted(url) {
    return p_(chrome.permissions.contains, {
        origins: [new URL(url).origin + '/*']
    });
}

async function wasPreviouslyLoaded(tabId, loadCheck) {
    const result = await p_(chrome.tabs.executeScript, tabId, {
        code: loadCheck,
        runAt: 'document_start'
    });

    return result?.[0];
}

if (typeof chrome === 'object' && !chrome.contentScripts) {
    chrome.contentScripts = {
        // The callback is only used by webextension-polyfill
        async register(contentScriptOptions, callback) {
            const {
                js = [],
                css = [],
                allFrames,
                matchAboutBlank,
                matches,
                runAt
            } = contentScriptOptions;
            // Injectable code; it sets a `true` property on `document` with the hash of the files as key.
            const loadCheck = `document[${JSON.stringify(JSON.stringify({ js, css }))}]`;

            const matchesRegex = patternToRegex(...matches);

            const listener = async (tabId, { status }) => {
                if (status !== 'loading') {
                    return;
                }

                const { url } = await p_(chrome.tabs.get, tabId);

                if (
                    !url || // No URL = no permission;
                    !matchesRegex.test(url) || // Manual `matches` glob matching
                    !await isOriginPermitted(url) || // Permissions check
                    await wasPreviouslyLoaded(tabId, loadCheck) // Double-injection avoidance
                ) {
                    return;
                }

                for (const file of css) {
                    chrome.tabs.insertCSS(tabId, {
                        ...file,
                        matchAboutBlank,
                        allFrames,
                        runAt: runAt ?? 'document_start' // CSS should prefer `document_start` when unspecified
                    });
                }

                for (const file of js) {
                    chrome.tabs.executeScript(tabId, {
                        ...file,
                        matchAboutBlank,
                        allFrames,
                        runAt
                    });
                }

                // Mark as loaded
                chrome.tabs.executeScript(tabId, {
                    code: `${loadCheck} = true`,
                    runAt: 'document_start',
                    allFrames
                });
            };

            chrome.tabs.onUpdated.addListener(listener);
            const registeredContentScript = {
                async unregister() {
                    return p_(chrome.tabs.onUpdated.removeListener.bind(chrome.tabs.onUpdated), listener);
                }
            };

            if (typeof callback === 'function') {
                callback(registeredContentScript);
            }

            return Promise.resolve(registeredContentScript);
        }
    };
}

// END https://github.com/fregante/content-scripts-register-polyfill

// Adapted from https://github.com/fregante/webext-dynamic-content-scripts
// Used and modified with permission of the MIT License
// BEGIN https://github.com/fregante/webext-dynamic-content-scripts

const registeredScripts = new Map();

// In Firefox, paths in the manifest are converted to full URLs under `moz-extension://` but browser.contentScripts expects exclusively relative paths
function convertPath(file) {
    const url = new URL(file, location.origin);
    return { file: url.pathname };
}

// Automatically register the content scripts on the new origins
async function registerOnOrigins({ origins: newOrigins }) {
    const manifest = chrome.runtime.getManifest().content_scripts;

    // Register one at a time to allow removing one at a time as well
    for (const origin of newOrigins || []) {
        for (const config of manifest) {
            const registeredScript = chrome.contentScripts.register({
                js: (config.js || []).map(convertPath),
                css: (config.css || []).map(convertPath),
                allFrames: config.all_frames,
                matches: config.matches.map(m => origin.slice(0, -2) + new URL(m).pathname),
                runAt: config.run_at
            });
            registeredScripts.set(origin, registeredScript);
        }
    }
}

(async () => {
    registerOnOrigins(await getAdditionalPermissions());
})();

chrome.permissions.onAdded.addListener(permissions => {
    if (permissions.origins && permissions.origins.length > 0) {
        registerOnOrigins(permissions);
    }
});

chrome.permissions.onRemoved.addListener(async ({ origins }) => {
    if (!origins || origins.length === 0) {
        return;
    }

    for (const [origin, script] of registeredScripts) {
        if (origins.includes(origin)) {
            // eslint-disable-next-line no-await-in-loop
            (await script).unregister();
        }
    }
});

// END https://github.com/fregante/webext-dynamic-content-scripts