import "jquery-ui/ui/widgets/sortable";

import { EXTENSION_NAME } from "./constants";
import { createButton, createElement, getBrowser } from "./dom";
import Modal from "./modal";
import { LegacySetting } from "./settings";
import { Settings } from "./splus-settings";
import Theme from "./theme";

var firstLoad = true;
var modalContents: HTMLDivElement | undefined = undefined;

LegacySetting.updateSettingsFunction = updateSettings;

export function getModalContents() {
    return modalContents || createElement("p", [], { textContent: "Error loading settings" });
}

/**
 * Updates the contents of the settings modal to reflect changes made by the user to all settings
 */
export async function updateSettings() {
    const syncStorageContents = await chrome.storage.sync.get(null);
    const localStorageContents = await chrome.storage.local.get(null);
    LegacySetting.rawSyncStorage = syncStorageContents;
    LegacySetting.rawLocalStorage = localStorageContents;

    if (firstLoad) {
        if (syncStorageContents.themes) {
            for (let t of syncStorageContents.themes) {
                Theme.themes.push(Theme.loadFromObject(t));
            }
        }

        Theme.apply(Theme.active);
        firstLoad = false;
    }

    let noControl = document.createElement("div");

    modalContents = createElement("div", [], undefined, [
        createElement("div", ["splus-modal-contents", "splus-settings-tabs"], {}, [
            createElement("ul", [], {}, [
                createElement("li", [], {}, [
                    createElement("a", [], {
                        href: "#splus-settings-section-appearance",
                        textContent: "Appearance",
                    }),
                ]),
                createElement("li", [], {}, [
                    createElement("a", [], {
                        href: "#splus-settings-section-sidebar",
                        textContent: "Homepage/Sidebar",
                    }),
                ]),
                createElement("li", [], {}, [
                    createElement("a", [], {
                        href: "#splus-settings-section-grades",
                        textContent: "Grades",
                    }),
                ]),
                createElement("li", [], {}, [
                    createElement("a", [], {
                        href: "#splus-settings-section-utilities",
                        textContent: "Utilities",
                    }),
                ]),
            ]),
            createElement("div", [], { id: "splus-settings-section-appearance" }, [
                Settings.ThemeEditorButton.settingsMenuElement,
                Settings.Theme.settingsMenuElement,
                Settings.OverrideCourseIcons.settingsMenuElement,
                Settings.UseDefaultIcons.settingsMenuElement,
                Settings.CourseIconFavicons.settingsMenuElement,
                Settings.OverrideCourseIcons.settingsMenuElement,
                Settings.ArchivedCoursesButton.settingsMenuElement,
                Settings.PowerSchoolLogo.settingsMenuElement,
            ]),
            createElement("div", [], { id: "splus-settings-section-sidebar" }, [
                Settings.IndicateSubmittedAssignments.settingsMenuElement,
                Settings.ToDoIconVisibility.settingsMenuElement,
                Settings.SidebarSectionOrder.settingsMenuElement,
            ]),
            createElement("div", [], { id: "splus-settings-section-grades" }, [
                Settings.CustomGradingScales.settingsMenuElement,
                Settings.CourseOrderMethod.settingsMenuElement,
                Settings.WeightedGradebookIndicator.settingsMenuElement,
            ]),
            createElement("div", [], { id: "splus-settings-section-utilities" }, [
                Settings.DesktopNotifications.settingsMenuElement,
                Settings.Broadcasts.settingsMenuElement,
                Settings.BypassLinkRedirects.settingsMenuElement,
                Settings.PersistSessionCookies.settingsMenuElement,
                createElement("div", ["setting-entry"], {}, [
                    createElement("h2", ["setting-title"], {}, [
                        createElement("a", [], {
                            href: "#",
                            textContent: "Change Schoology Account Access",
                            onclick: () => {
                                location.pathname = "/api";
                            },
                            style: { fontSize: "" },
                        }),
                    ]),
                    createElement("p", ["setting-description"], {
                        textContent: `Grant ${EXTENSION_NAME} access to your Schoology API Key so many features can function, or revoke that access.`,
                    }),
                ]),
                getBrowser() !== "Firefox"
                    ? createElement("div", ["setting-entry"], {}, [
                          createElement("h2", ["setting-title"], {}, [
                              createElement("a", [], {
                                  href: "#",
                                  textContent: "Anonymous Usage Statistics",
                                  onclick: () => Modal.openModal("analytics-modal"),
                                  style: { fontSize: "" },
                              }),
                          ]),
                          createElement("p", ["setting-description"], {
                              textContent: `[Reload required] Allow ${EXTENSION_NAME} to collect anonymous information about how you use the extension. We don't collect any personal information per our privacy policy.`,
                          }),
                      ])
                    : noControl,
            ]),
        ]),
        createElement("div", ["settings-buttons-wrapper"], undefined, [
            createButton("save-settings", "Save Settings", () => LegacySetting.saveModified()),
            createElement("div", ["settings-actions-wrapper"], {}, [
                createElement("a", [], {
                    textContent: "View Debug Info",
                    onclick: () => Modal.openModal("debug-modal"),
                    href: "#",
                }),
                createElement("a", [], {
                    textContent: "Export Settings",
                    onclick: LegacySetting.export,
                    href: "#",
                }),
                createElement("a", [], {
                    textContent: "Import Settings",
                    onclick: LegacySetting.import,
                    href: "#",
                }),
                createElement("a", ["restore-defaults"], {
                    textContent: "Restore Defaults",
                    onclick: LegacySetting.restoreDefaults,
                    href: "#",
                }),
            ]),
        ]),
    ]);
}
