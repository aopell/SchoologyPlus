import { trackEvent } from "./analytics";
import { createBroadcast, saveBroadcasts } from "./broadcast";
import { DISCORD_URL, EXTENSION_NAME } from "./constants";
import { getBrowser } from "./dom";
import { Logger } from "./logger";
import Modal from "./modal";
import { Setting } from "./settings";
import { createToastButton, showToast } from "./toast";

/** Compares two version strings a and b.
 * @param {string} verA A string representing a numerical version.
 * @param {string} verB A string representing a numerical version.
 * @returns {-1|1|0} A number less than 0 if a is less than b; a number greater than zero if a is greater than b; and a number equal to zero if a is equal to b.
 */
export function compareVersions(verA: string, verB: string): -1 | 1 | 0 {
    function sanitizeVersion(ver: string) {
        let matchedVer = ver.match(/\d+(\.\d+)*/)![0];
        return matchedVer.split(".").map(x => +x);
    }
    let a = sanitizeVersion(verA);
    let b = sanitizeVersion(verB);

    let swapped = false;
    if (b.length < a.length) {
        let temp = a;
        a = b;
        b = temp;
        swapped = true;
    }

    while (a.length < b.length) {
        a.push(0);
    }

    if (swapped) {
        let temp = a;
        a = b;
        b = temp;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) {
            return -1;
        } else if (a[i] > b[i]) {
            return 1;
        }
    }
    return 0;
}

/*
 * Migrations to a given version from any versions before it.
 * Should be ordered in increasing version order.
 */
const migrationsTo: {
    [k: number | string]: (currentVersion: string, previousVersion?: string) => void;
} = {
    7.0: function (currentVersion, previousVersion) {
        saveBroadcasts([
            createBroadcast(
                510,
                `${EXTENSION_NAME} Discord Server`,
                `${EXTENSION_NAME} has a Discord server where you can offer feature suggestions, report bugs, get support, or just talk with other ${EXTENSION_NAME} users. <a href="${DISCORD_URL}" id="announcement-discord-link" class="splus-track-clicks">Click here</a> to join!`,
                new Date(2019, 1 /* February - don't you just love JavaScript */, 14)
            ),
        ]);

        if (getBrowser() !== "Firefox") {
            let analyticsModalExistsInterval = setInterval(function () {
                if (
                    document.readyState === "complete" &&
                    document.getElementById("analytics-modal") &&
                    !document.querySelector(".splus-modal-open")
                ) {
                    clearInterval(analyticsModalExistsInterval);
                    Modal.openModal("analytics-modal");
                }
            }, 50);
        }

        let chooseThemeModalExistsInterval = setInterval(function () {
            if (
                document.readyState === "complete" &&
                document.getElementById("choose-theme-modal") &&
                !document.querySelector(".splus-modal-open")
            ) {
                clearInterval(chooseThemeModalExistsInterval);
                Modal.openModal("choose-theme-modal");
            }
        }, 50);

        var accessToAccountInterval = setInterval(function () {
            if (
                document.readyState === "complete" &&
                !document.querySelector(".splus-modal-open")
            ) {
                clearInterval(accessToAccountInterval);
                if (!Setting.getValue("apistatus")) {
                    location.pathname = "/api";
                }
            }
        }, 50);
    },
    8.0: function (currentVersion, previousVersion) {},
};

export async function versionSpecificFirstLaunch(currentVersion: string, previousVersion?: string) {
    Logger.log(
        "[Updater] First launch after update, updating to ",
        currentVersion,
        " from ",
        previousVersion
    );

    if (!previousVersion) {
        trackEvent("perform_action", {
            id: "install_extension",
            value: currentVersion,
            context: "Versions",
            legacyTarget: "Install",
            legacyAction: currentVersion,
            legacyLabel: "Versions",
        });
    } else {
        trackEvent("perform_action", {
            id: "update_extension",
            value: currentVersion,
            previousValue: previousVersion,
            context: "Versions",
            legacyTarget: "Update",
            legacyAction: `${previousVersion} to ${currentVersion}`,
            legacyLabel: "Versions",
        });
    }

    // TODO add special handling if any migrations return a Promise such that we run in order
    for (let migrateTo in migrationsTo) {
        if (!previousVersion) {
            migrationsTo[migrateTo](currentVersion, previousVersion);
        } else if (
            compareVersions(migrateTo, currentVersion) <= 0 &&
            compareVersions(migrateTo, previousVersion) > 0
        ) {
            migrationsTo[migrateTo](currentVersion, previousVersion);
        }
    }
}
