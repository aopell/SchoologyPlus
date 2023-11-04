import { MountableElementsStore } from '../../solid.jsx';
import { Logger } from '../../utils/logger.js';
import { ApiPortal } from './portal.jsx';

export const apiPage = () => {
    const logger = Logger.createContext('addons::api::apiPage');

    logger.info('API page loaded!');

    // If the url query contains '#sgyplus-bypass', bypass the component
    if (window.location.hash !== '#sgyplus-bypass') {
        MountableElementsStore.registerComponent(ApiPortal);
        return;
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
            logger.debug('Consumer secret is not visible, cannot bypass.');
            return;
        }

        logger.debug('Consumer key: %s', consumerKey);
    }
};
