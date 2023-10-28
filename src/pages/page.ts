import { Logger } from '../utils/logger';

export const pagePage = () => {
    const logger = Logger.createContext('pages::page::pagePage');

    logger.info('Page page loaded!');
};
