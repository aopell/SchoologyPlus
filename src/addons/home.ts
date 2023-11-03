import { Logger } from '../utils/logger.js';

export const homePage = () => {
    const logger = Logger.createContext('addons::home::homePage');

    logger.info('Home page loaded!');
};
