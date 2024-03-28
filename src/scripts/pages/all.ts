import { Logger } from "../utils/logger";
import { Setting, updateSettings } from "../utils/settings";
import { getBrowser } from "../utils/dom";

import browser from "webextension-polyfill";

async function load() {
    Logger.log(`Loaded Schoology Plus version ${browser.runtime.getManifest().version}${getBrowser() != "Chrome" || (browser.runtime.getManifest() as any).update_url ? '' : ' (development version)'}`);
    document.documentElement.setAttribute("page", location.pathname);

    await updateSettings();

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