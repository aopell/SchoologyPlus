import { Logger } from '../utils/logger.js';

export const coursePage = () => {
    const logger = Logger.createContext('addons::course::coursePage');

    logger.info('Course page loaded!');
};
