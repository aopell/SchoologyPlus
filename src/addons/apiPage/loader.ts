import { MountableElementsStore } from '../../solid.jsx';
import { StorableSettings } from '../../store/storable.js';
import { CachedDataStore } from '../../utils/cache.js';
import { Logger } from '../../utils/logger.js';
import { ApiPortal } from './portal.jsx';

export const apiPage = () => {
    const logger = Logger.createContext('addons::api::apiPage');

    logger.info('API page loaded!');

    // If the url query contains '#sgyplus-bypass', bypass the component
    if (window.location.hash !== '#sgyplus-bypass') {
        MountableElementsStore.registerComponent(ApiPortal);
    }

    // Look for elements
    const consumerKeyMount = document.getElementById('edit-current-key');
    const consumerSecretMount = document.getElementById('edit-current-secret');

    if (
        consumerKeyMount instanceof HTMLInputElement &&
        consumerSecretMount instanceof HTMLInputElement
    ) {
        // Get values
        const consumerKey = consumerKeyMount.value;
        const consumerSecret = consumerSecretMount.value;

        if (consumerSecret.includes('*')) {
            logger.debug('Consumer secret is not visible, skipping.');
            return;
        }

        // Get the user id
        const [cache, setCache] = CachedDataStore.getStoreRef();
        const uid = cache.user?.id;

        if (!cache.user || !uid) {
            logger.warn('User cache not loaded, skipping.');
            return;
        }

        // Store
        const [settings, setSettings] = StorableSettings.getStoreRef();

        // Check if we should capture id
        if (typeof settings.apiKeys[uid] === 'undefined') {
            logger.debug('API key capturing disabled for account with id %s, skipping.', uid);
            return;
        }

        // Save the data
        logger.info('Saving data...');

        setCache({
            ...cache,
            user: {
                ...cache.user,
                token: {
                    consumerKey,
                    consumerSecret
                }
            }
        });

        const apiKeys = { ...settings.apiKeys };

        apiKeys[uid] = {
            type: 'enabled',
            consumerKey,
            consumerSecret
        };

        setSettings({
            ...settings,
            apiKeys
        });
    } else {
        logger.debug('Could not find consumer key or secret mount, skipping.');
    }
};
