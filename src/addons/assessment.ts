import { Logger } from '../utils/logger.js';

export const assessmentPage = () => {
    const logger = Logger.createContext('addons::assessment::assessmentPage');

    logger.info('Assessment page loaded!');
};
