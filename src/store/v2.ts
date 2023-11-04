import { TLogType } from '../utils/logger.js';
import { IStoreVersionless } from './storable.js';

export interface IStoreV2 extends IStoreVersionless {
    version: {
        major: number;
        minor: number;
        patch: number;
    };
    userPreferences: {
        logLevel: TLogType;
        themeMode: 'light' | 'dark' | 'system';
    };
    apiKeys: {
        [accountId: string]:
            | {
                  type: 'enabled';
                  consumerKey: string;
                  consumerSecret: string;
              }
            | {
                  type: 'non-captured';
              };
    };
}

export const defaultStoreV2: IStoreV2 = {
    version: {
        major: 0,
        minor: 0,
        patch: 0
    },
    userPreferences: {
        logLevel: 'INFO',
        themeMode: 'system'
    },
    apiKeys: {}
};
