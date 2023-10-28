import { Logger } from '../utils/logger';

export const coursesPage = () => {
    const logger = Logger.createContext('pages::courses::coursesPage');

    logger.info('Courses page loaded!');
};
