import { Logger } from '../utils/logger';

export const gradesPage = () => {
    const logger = Logger.createContext('pages::grades::gradesPage');

    logger.info('Grades page loaded!');
};
