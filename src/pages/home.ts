import { Logger } from '../utils/logger';

export const homePage = () => {
    const logger = Logger.createContext('pages::home::homePage');

    logger.info('Home page loaded!');
};
