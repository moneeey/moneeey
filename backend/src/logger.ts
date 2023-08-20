type Level = "info" | "warn" | "error";

interface ILogger {
  info(message: string, data: object): void;
  warn(message: string, data: object): void;
  error(message: string, data: object): void;
}

export const loggerInternals = {
  emit(level: Level, message: string, data: object, emitter = console) {
    emitter[level](message, JSON.stringify(data));
  },
};

export function Logger(name: string): ILogger {
  const log = (level: Level) => (message: string, data: object) =>
    loggerInternals.emit(level, `[${name}] ${message}`, data);
  return {
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
  };
}
