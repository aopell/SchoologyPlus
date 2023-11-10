import { Logger } from '../utils/logger.js';

export const pagePage = () => {
    const logger = Logger.createContext('addons::page::pagePage');

    logger.info('Page page loaded!');
};
