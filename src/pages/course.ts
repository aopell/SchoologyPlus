import { Logger } from '../utils/logger';

export const coursePage = () => {
    const logger = Logger.createContext('pages::course::coursePage');

    logger.info('Course page loaded!');
};
