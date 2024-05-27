import { Setting } from "./settings";

export type Broadcast = {
    id: string;
    title: string;
    message: string;
    timestamp?: number;
    expires?: number;
    version?: string;
};

/**
 * @param {Broadcast[]} broadcasts Broadcasts to save
 */
export async function saveBroadcasts(broadcasts: Broadcast[]) {
    let values = await chrome.storage.sync.get(["unreadBroadcasts"]);
    let b: Broadcast[] = values.unreadBroadcasts || [];
    let ids = b.map(x => x.id);
    for (let br of broadcasts) {
        if (!ids.includes(br.id)) {
            b.push(br);
        }
    }
    await chrome.storage.sync.set({ unreadBroadcasts: b });
}

/**
 * Creates a Broadcast. Result should be passed directly to `createBroadcasts`.
 * @param {number} id Broadcast ID number, should be unique
 * @param {string} title Short title for the broadcast
 * @param {string} message HTML content to be displayed in the home feed
 * @param {Date|number} timestamp Timestamp to show as the post time in the home feed
 * @returns {Broadcast}
 */
export function createBroadcast(
    id: number | string,
    title: string,
    message: string,
    timestamp: Date | number = Date.now(),
    expires?: Date | number
): Broadcast {
    return {
        id: String(id),
        title,
        message,
        timestamp: +timestamp,
        expires: expires !== undefined ? +expires : undefined,
    };
}

/**
 * Deletes broadcasts with the given IDs if they exist
 * @param  {...number} ids Broadcasts to delete
 */
export async function deleteBroadcasts(...ids: string[]) {
    for (let id of ids) {
        let unreadBroadcasts: Broadcast[] = Setting.getValue("unreadBroadcasts", []);
        if (!unreadBroadcasts) continue;
        unreadBroadcasts.splice(
            unreadBroadcasts.findIndex(x => x.id == id),
            1
        );

        await Setting.setValue("unreadBroadcasts", unreadBroadcasts);

        let broadcastElement = document.getElementById(`broadcast${id}`);
        if (broadcastElement) {
            broadcastElement.outerHTML = "";
        }
    }
}
