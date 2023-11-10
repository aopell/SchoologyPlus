import { createStore } from 'solid-js/store';
import { getUserId } from './userId.js';
import { StorableSettings } from '../store/storable.js';
import { Logger } from './logger.js';

export interface CacheStore {
    user: {
        id: string;
        token: {
            consumerKey: string;
            consumerSecret: string;
        } | null;
    } | null;
}

/**
 * A class that stores all useful data in the cache so we don't have to keep making requests.
 */
export class CachedDataStore {
    private static instance = new CachedDataStore();

    private cache: [CacheStore, (store: CacheStore) => void] | null = null;

    private constructor() {}

    /**
     * Gets the store reference.
     */
    public static getStoreRef(): [CacheStore, (store: CacheStore) => void] {
        return this.instance.cache!;
    }

    /**
     * Loads stuff into the cache.
     * MUST BE CALLED BEFORE USE
     */
    public static async load(): Promise<void> {
        const logger = Logger.createContext('store::storable::CachedDataStore::load');
        if (this.instance.cache !== null) {
            logger.warn('Attempted to load cache twice.');
            return;
        }

        const store: CacheStore = {
            user: null
        };

        // Get the user id
        const userId = await getUserId();

        if (!userId) {
            logger.info('Not signed in... skipping user cache.');
        } else {
            logger.info('Signed in... loading user cache.');

            store.user = {
                id: userId,
                token: null
            };

            const token = StorableSettings.getStoreRef()[0].apiKeys[userId];

            if (token && token.type === 'enabled') {
                store.user = {
                    id: userId,
                    token: {
                        consumerKey: token.consumerKey,
                        consumerSecret: token.consumerSecret
                    }
                };
            }
        }

        // Create the store
        this.instance.cache = createStore<CacheStore>(store);
    }
}
