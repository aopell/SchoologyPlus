import { trackEvent } from "../utils/analytics";
import { getUserId } from "../utils/api";
import { DISCORD_URL, EXTENSION_NAME, EXTENSION_WEBSITE } from "../utils/constants";
import { createButton, createElement } from "../utils/dom";
import { Setting } from "../utils/settings";

export async function load() {
    let currentKey = document.getElementById("edit-current-key") as HTMLInputElement;
    let currentSecret = document.getElementById("edit-current-secret") as HTMLInputElement;

    if (currentKey && currentSecret) {
        // If API key has already been generated
        await handleGeneratedApiKey(currentKey, currentSecret);
    }

    createRequestPermissionScreen(currentKey, currentSecret);
}

async function handleGeneratedApiKey(
    currentKey: HTMLInputElement,
    currentSecret: HTMLInputElement
) {
    currentKey.parentElement!.style.display = "none";
    currentSecret.parentElement!.style.display = "none";

    if (currentSecret.value.indexOf("*") === -1) {
        let key = currentKey.value;
        let secret = currentSecret.value;

        trackEvent("update_setting", {
            id: "apistatus",
            context: "API Key Page",
            value: "allowed",
            legacyTarget: "Change Access",
            legacyAction: "allowed",
            legacyLabel: "API Key",
        });

        await Setting.setValue("apikey", key);
        await Setting.setValue("apisecret", secret);
        await Setting.setValue("apiuser", getUserId());
        await Setting.setValue("apistatus", "allowed");
        location.pathname = "/";
    }
}

function createRequestPermissionScreen(
    currentKey: HTMLInputElement,
    currentSecret: HTMLInputElement
) {
    let centerInner = document.getElementById("center-inner")!;
    centerInner.classList.add("splus-api-key-page");
    centerInner.parentElement!.classList.add("splus-api-key-page");

    centerInner.prepend(
        createElement("div", ["splus-permissions-wrapper"], {}, [
            createElement("div", ["splus-permissions-box"], {}, [
                createElement("div", ["splus-permissions-icon-wrapper"], {}, [
                    createElement("img", ["splus-permissions-icon"], {
                        src: chrome.runtime.getURL("/imgs/logo-full.png"),
                    }),
                ]),
                createElement("div", ["splus-permissions-header"], {}, [
                    createElement("h2", ["splus-permissions-title"], {
                        textContent: `${EXTENSION_NAME} Needs Access to Your Account`,
                    }),
                    createElement("p", ["splus-permissions-description"], {}, [
                        createElement("span", [], {
                            textContent: `Due to a new security feature, ${EXTENSION_NAME} needs access to your Schoology API Key for the following features to work correctly:`,
                        }),
                        createElement("div", ["splus-permissions-section"], {}, [
                            createElement("ul", ["splus-permissions-features-list"], {}, [
                                createElement("li", [], { textContent: "What-If Grades" }),
                                createElement("li", [], { textContent: "Assignment Checkmarks" }),
                                createElement("li", [], { textContent: "Quick Access" }),
                                createElement("li", [], { textContent: "Courses in Common" }),
                            ]),
                        ]),
                        createElement("span", [], {
                            textContent: `By providing access to your API key, ${EXTENSION_NAME} can view extra details about the courses you're enrolled in.`,
                        }),
                        createElement("div", ["splus-permissions-section"], {}, [
                            createElement("strong", [], {
                                textContent: `${EXTENSION_NAME} will never:`,
                            }),
                            createElement("ul", ["splus-permissions-never-list"], {}, [
                                createElement("li", [], {
                                    textContent: "Collect or store any personal information",
                                }),
                                createElement("li", [], {
                                    textContent: "Have access to your account's password",
                                }),
                            ]),
                        ]),
                        createElement("div", ["splus-permissions-section"], {}, [
                            createElement("span", [], {
                                textContent: "If you have any questions, you can",
                            }),
                            createElement("a", ["splus-track-clicks"], {
                                id: "api-key-page-github-link",
                                textContent: " view our code on Github",
                                href: "https://github.com/aopell/SchoologyPlus",
                            }),
                            createElement("span", ["splus-track-clicks"], {
                                id: "api-key-page-discord-link",
                                textContent: " or",
                            }),
                            createElement("a", [], {
                                textContent: " contact us on Discord",
                                href: DISCORD_URL,
                            }),
                            createElement("span", [], {
                                textContent: `. You can change this setting at any time in the ${EXTENSION_NAME} settings menu.`,
                            }),
                        ]),
                    ]),
                ]),
                createElement("div", ["splus-permissions-close"], {}, [
                    createElement("span", [], {
                        textContent: "×",
                        title: "Hide this message and show the original API key page (for developers)",
                        onclick: function () {
                            (
                                document.getElementsByClassName(
                                    ".splus-permissions-wrapper"
                                )[0] as HTMLElement
                            ).style.display = "none";
                            currentKey.parentElement!.style.display = "block";
                            currentSecret.parentElement!.style.display = "block";
                            document
                                .getElementsByClassName("splus-api-key-page")[0]
                                .classList.remove("splus-api-key-page");
                            document
                                .getElementsByClassName("splus-api-key-page")[0]
                                .classList.remove("splus-api-key-page");
                            (
                                document.getElementsByClassName(
                                    "splus-api-key-footer"
                                )[0] as HTMLElement
                            ).style.display = "none";
                            let submitButton = (document.getElementById("edit-reveal") ||
                                document.getElementById("edit-request")) as HTMLInputElement;
                            submitButton.value = "Reveal Existing Secret";
                            submitButton.parentElement!.classList.remove("splus-allow-access");
                            document.location.search = "showkey";
                        },
                    }),
                ]),
            ]),
        ])
    );

    let submitButton = (document.getElementById("edit-reveal") ||
        document.getElementById("edit-request")) as HTMLInputElement | null;

    if (submitButton === null) {
        handleMissingApiPermissions();
    } else {
        submitButton.parentElement!.classList.add("splus-allow-access");
        submitButton.value = "Allow Access";

        submitButton.parentElement!.insertAdjacentElement(
            "afterend",
            createElement("div", ["splus-api-key-footer"], { style: { textAlign: "center" } }, [
                createElement("a", [], {
                    href: "#",
                    textContent: "Deny Access",
                    onclick: denyApiAccess,
                }),
            ])
        );
    }
}

async function denyApiAccess() {
    alert(
        `API key access was denied. Please keep in mind many ${EXTENSION_NAME} features will not work correctly with this disabled. You can change this at any time from the ${EXTENSION_NAME} settings menu.`
    );
    trackEvent("update_setting", {
        id: "apistatus",
        context: "API Key Page",
        value: "denied",
        legacyTarget: "Change Access",
        legacyAction: "denied",
        legacyLabel: "API Key",
    });
    await Setting.setValue("apiuser", getUserId());
    await Setting.setValue("apistatus", "denied");
    location.pathname = "/";
}

function handleMissingApiPermissions() {
    let permElement = document.getElementsByClassName("splus-permissions-description")[0];
    permElement.append(createElement("br", [], {}));
    permElement.append(createElement("br", [], {}));
    permElement.append(
        createElement(
            "div",
            ["splus-permissions-section"],
            {
                style: "background-color: var(--error, #F44336); color: var(--contrast-text, white); padding: var(--padding, 5px); border-radius: var(--border-radius, 0px);",
            },
            [
                createElement("span", [], {
                    textContent: `It looks like your school or district has disabled API Key generation. Unfortunately, this means the above features will not work. The rest of ${EXTENSION_NAME}' features will still work, though!`,
                }),

                createElement("div", ["splus-permissions-section"], {}, [
                    createElement("a", ["splus-permissions-link", "splus-track-clicks"], {
                        href: `${EXTENSION_WEBSITE}/docs/faq/api`,
                        textContent: "Click Here to Read More",
                        id: "api-key-disabled-read-more",
                    }),
                ]),
            ]
        )
    );

    if (
        Setting.getValue("apistatus") !== "allowed" &&
        Setting.getValue("apistatus") !== "blocked"
    ) {
        trackEvent("update_setting", {
            id: "apistatus",
            context: "API Key Page",
            value: "blocked",
            legacyTarget: "Change Access",
            legacyAction: "blocked",
            legacyLabel: "API Key",
        });
        Setting.setValue("apistatus", "blocked");
    }

    permElement.appendChild(
        createButton(
            "api-key-disabled-back-to-home",
            "Go Back to Homepage",
            () => (location.pathname = "/")
        )
    );
}
