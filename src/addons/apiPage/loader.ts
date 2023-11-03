import { MountableElementsStore } from '../../solid.jsx';
import { Logger } from '../../utils/logger.js';
import { ApiPortal } from './portal.jsx';

export const apiPage = () => {
    const logger = Logger.createContext('addons::api::apiPage');

    logger.info('API page loaded!');

    MountableElementsStore.registerComponent(ApiPortal);
};
