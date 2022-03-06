(async function () {
    // Wait for loader.js to finish running
    while (!window.splusLoaded) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    await loadDependencies("api-key", ["all"]);
})();

(function () {
    let currentKey = document.getElementById("edit-current-key");
    let currentSecret = document.getElementById("edit-current-secret");

    if (currentKey && currentSecret) {
        // If API key has already been generated
        currentKey.parentElement.style.display = "none";
        currentSecret.parentElement.style.display = "none";

        if (currentSecret.value.indexOf("*") === -1) {
            let key = currentKey.value;
            let secret = currentSecret.value;

            trackEvent("Change Access", "allowed", "API Key");

            Setting.setValue("apikey", key, () => {
                Setting.setValue("apisecret", secret, () => {
                    Setting.setValue("apiuser", getUserId(), () => {
                        Setting.setValue("apistatus", "allowed", () => {
                            location.pathname = "/";
                        });
                    });
                });
            });
        }
    }

    let centerInner = document.getElementById("center-inner");
    centerInner.classList.add("splus-api-key-page");
    centerInner.parentElement.classList.add("splus-api-key-page");

    centerInner.prepend(createElement("div", ["splus-permissions-wrapper"], {}, [
        createElement("div", ["splus-permissions-box"], {}, [
            createElement("div", ["splus-permissions-icon-wrapper"], {}, [
                createElement("img", ["splus-permissions-icon"], { src: chrome.runtime.getURL("/imgs/logo-full.png") }),
            ]),
            createElement("div", ["splus-permissions-header"], {}, [
                createElement("h2", ["splus-permissions-title"], { textContent: "Schoology Plus Needs Access to Your Account" }),
                createElement("p", ["splus-permissions-description"], {}, [
                    createElement("span", [], { textContent: "Due to a new security feature, Schoology Plus needs access to your Schoology API Key for the following features to work correctly:" }),
                    createElement("div", ["splus-permissions-section"], {}, [
                        createElement("ul", ["splus-permissions-features-list"], {}, [
                            createElement("li", [], { textContent: "What-If Grades" }),
                            createElement("li", [], { textContent: "Assignment Checkmarks" }),
                            createElement("li", [], { textContent: "Quick Access" }),
                            createElement("li", [], { textContent: "Courses in Common" }),
                        ]),
                    ]),
                    createElement("span", [], { textContent: "By providing access to your API key, Schoology Plus can view extra details about the courses you're enrolled in." }),
                    createElement("div", ["splus-permissions-section"], {}, [
                        createElement("strong", [], { textContent: "Schoology Plus will never:" }),
                        createElement("ul", ["splus-permissions-never-list"], {}, [
                            createElement("li", [], { textContent: "Collect or store any personal information" }),
                            createElement("li", [], { textContent: "Have access to your account's password" }),
                        ]),
                    ]),
                    createElement("div", ["splus-permissions-section"], {}, [
                        createElement("span", [], { textContent: "If you have any questions, you can" }),
                        createElement("a", [], { textContent: " view our code on Github", href: "https://github.com/aopell/SchoologyPlus" }),
                        createElement("span", [], { textContent: " or" }),
                        createElement("a", [], { textContent: " contact us on Discord", href: "https://discord.schoologypl.us" }),
                        createElement("span", [], { textContent: ". You can change this setting at any time in the Schoology Plus settings menu." }),
                    ]),
                ]),
            ]),
        ])
    ]));

    let submitButton = document.getElementById("edit-reveal") || document.getElementById("edit-request");
    submitButton.parentElement.classList.add("splus-allow-access");
    submitButton.value = "Allow Access";

    submitButton.parentElement.insertAdjacentElement("afterend", createElement("div", ["splus-api-key-footer"], { style: { textAlign: "center" } }, [
        createElement("a", [], {
            textContent: "Deny Access", onclick: () => {
                alert("API key access was denied. Please keep in mind many Schoology Plus features will not work correctly with this disabled. You can change this at any time from the Schoology Plus settings menu.");
                trackEvent("Change Access", "denied", "API Key");
                Setting.setValue("apiuser", getUserId(), () => {
                    Setting.setValue("apistatus", "denied", () => {
                        location.pathname = "/";
                    });
                });
            }
        }),
    ]));
})();