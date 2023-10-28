import format from 'format-util';

type TLogType = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const logColors: Record<TLogType, string> = {
    DEBUG: '#2196F3',
    INFO: '#4CAF50',
    WARN: '#FF9800',
    ERROR: '#F44336'
};

const logContextColors: Record<TLogType, string> = {
    DEBUG: '#BBDEFB',
    INFO: '#C8E6C9',
    WARN: '#FFE0B2',
    ERROR: '#FFCDD2'
};

const logLevels: Record<TLogType, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

export class LoggerContext {
    private path: string;
    private logger: Logger;

    constructor(path: string, logger: Logger) {
        this.path = path;
        this.logger = logger;
    }

    private log(level: TLogType, message: string, ...args: string[]): void {
        this.logger.log(level, this.path, message, args);
    }

    public debug(message: string, ...args: string[]): void {
        this.log('DEBUG', message, ...args);
    }

    public info(message: string, ...args: string[]): void {
        this.log('INFO', message, ...args);
    }

    public warn(message: string, ...args: string[]): void {
        this.log('WARN', message, ...args);
    }

    public error(message: string, ...args: string[]): void {
        this.log('ERROR', message, ...args);
    }
}

export class Logger {
    private static instance = new Logger();

    private logLevel: TLogType = 'DEBUG';

    private constructor() {}

    public static getInstance(): Logger {
        return Logger.instance;
    }

    public log(level: TLogType, path: string, message: string, args: string[]): void {
        if (logLevels[level] < logLevels[this.logLevel]) {
            return;
        }

        // Format log
        const formated = format(message, ...args);

        const color = logColors[level];
        const contextColor = logContextColors[level];
        const base = `%c[${level}] %c${path}`;
        console.log(base, `color: ${color};`, `color: ${contextColor};`, formated);
    }

    public setLogLevel(level: TLogType): void {
        this.logLevel = level;
    }

    public static createContext(path: string): LoggerContext {
        return new LoggerContext('sgyplus::' + path, Logger.getInstance());
    }
}
