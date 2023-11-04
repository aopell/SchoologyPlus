import { createStore } from 'solid-js/store';
import { Logger } from '../utils/logger.js';
import { IStoreV2, defaultStoreV2 } from './v2.js';

export interface IStoreVersionless {
    version: {
        major: number;
        minor: number;
        patch: number;
    };
}

/**
 * A class that stores all user extension settings.
 */
export class StorableSettings {
    private static instance = new StorableSettings();

    private settingsStore: [IStoreV2, (store: IStoreV2) => void] =
        createStore<IStoreV2>(defaultStoreV2);
    private ready = false;

    /**
     * Loads the settings from the chrome storage (once in the lifetime of the extension).
     */
    public static async load(): Promise<void> {
        const logger = Logger.createContext('store::storable::StorableSettings::load');

        if (this.instance.ready) {
            logger.warn('Attempted to load settings twice.');
            return;
        }

        this.instance.settingsStore[1](await this.instance.loadSettings());
        this.instance.ready = true;

        // Add a listener to update the settings when they change.
        chrome.storage.onChanged.addListener(async () => {
            logger.debug('Settings changed in chrome storage.');
            this.instance.settingsStore[1](await this.instance.loadSettings());
        });
    }

    /**
     * Loads the settings from the chrome storage.
     */
    private async loadSettings(): Promise<IStoreV2> {
        const logger = Logger.createContext('store::storable::StorableSettings::loadSettings');

        const data = await chrome.storage.local.get('settings');
        logger.debug('Loaded settings from chrome storage.');

        // Default to the first settings object.
        if (
            data === undefined ||
            data === null ||
            data['settings'] === undefined ||
            data['settings'] === null
        ) {
            logger.debug('Defaulting to default settings.');
            return this.settingsStore[0];
        }

        // Chrome storage doesn't have to be string, so try to avoid errors.
        if (typeof data['settings'] !== 'string') {
            logger.warn('Failed to load settings from chrome storage. (typeof data !== "string")');
            return this.settingsStore[0];
        }

        const dataString = data['settings'];

        // Parse the settings from the chrome storage.
        const json: IStoreVersionless | undefined = (() => {
            try {
                return JSON.parse(dataString) as IStoreVersionless;
            } catch (e) {
                logger.warn('Failed to parse settings from chrome storage.');
                return undefined;
            }
        })();

        if (json === undefined) {
            return this.settingsStore[0];
        }

        // Check if the settings are outdated.
        if (json.version.major < this.settingsStore[0].version.major) {
            logger.warn('Settings are outdated. (major)');

            // TODO: Update the settings.

            throw new Error('Settings are outdated. (major)');
        }

        const v2 = json as IStoreV2;

        // Update log level.
        Logger.getInstance().setLogLevel(v2.userPreferences.logLevel);

        return v2;
    }

    /**
     * Saves the settings to the chrome storage.
     */
    private async saveSettings(): Promise<void> {
        const logger = Logger.createContext('store::storable::StorableSettings::saveSettings');

        const data = JSON.stringify(this.settingsStore[0]);
        await chrome.storage.local.set({ settings: data });
        logger.debug('Saved settings to chrome storage.');
    }

    /**
     * Gets the hook to the settings store.
     */
    public static getStoreRef(): [IStoreV2, (store: IStoreV2) => void] {
        return [
            this.instance.settingsStore[0],
            (store: IStoreV2) => {
                // Also save the settings to the chrome storage.
                this.instance.saveSettings();
                this.instance.settingsStore[1](store);
            }
        ];
    }

    /**
     * Gets the singleton instance of the settings.
     */
    public static getInstance(): StorableSettings {
        return StorableSettings.instance;
    }

    private constructor() {}
}
