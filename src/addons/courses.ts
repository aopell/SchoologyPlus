import { Logger } from '../utils/logger.js';

export const coursesPage = () => {
    const logger = Logger.createContext('addons::courses::coursesPage');

    logger.info('Courses page loaded!');
};
