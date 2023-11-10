import { Logger } from '../utils/logger.js';

export const gradesPage = () => {
    const logger = Logger.createContext('addons::grades::gradesPage');

    logger.info('Grades page loaded!');
};
