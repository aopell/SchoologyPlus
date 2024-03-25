import { Logger } from "../utils/logger";
import { Setting, updateSettings } from "../utils/settings";
import { getBrowser } from "../utils/dom";

function load() {
    Logger.log(`Loaded Schoology Plus version ${chrome.runtime.getManifest().version}${getBrowser() != "Chrome" || chrome.runtime.getManifest().update_url ? '' : ' (development version)'}`);
    document.documentElement.setAttribute("page", location.pathname);

    updateSettings();

    new Setting(
        "defaultDomain",
        "Default Schoology Domain",
        "The website on which Schoology Plus runs. Cannot be changed here.",
        "app.schoology.com",
        "text",
        {
            disabled: true
        },
        value => value,
        undefined,
        element => element.value
    );

    Logger.debug("Finished loading preload.js");
}