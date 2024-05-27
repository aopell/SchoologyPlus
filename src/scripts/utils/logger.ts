type LoggerFunction = (...args: any[]) => void;

interface Logger {
    log: LoggerFunction;
    error: LoggerFunction;
    info: LoggerFunction;
    warn: LoggerFunction;
    trace: LoggerFunction;
    debug: LoggerFunction;
}

export const Logger: Logger = {
    log: (() => console.log.bind(globalThis.console, `%c+`, createLogPrefix("#81D4FA")))(),
    error: (() => console.error.bind(globalThis.console, `%c+`, createLogPrefix("#FF6961")))(),
    info: (() => console.info.bind(globalThis.console, `%c+`, createLogPrefix("white")))(),
    warn: (() => console.warn.bind(globalThis.console, `%c+`, createLogPrefix("#FDFD96")))(),
    trace: (() => console.trace.bind(globalThis.console, `%c+`, createLogPrefix("orange")))(),
    debug: (() => console.debug.bind(globalThis.console, `%c+`, createLogPrefix("lightgreen")))(),
};

function createLogPrefix(color: string): string {
    return `color:${color};border:1px solid #2A2A2A;border-radius:100%;font-size:14px;font-weight:bold;padding: 0 4px 0 4px;background-color:#2A2A2A`;
}
