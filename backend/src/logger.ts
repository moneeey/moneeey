type Level = "info" | "warn" | "error";

interface ILogger {
	info(message: string, data: object): void;
	warn(message: string, data: object): void;
	error(message: string, data: object): void;
}

function replacer(_key: string, value: unknown) {
	if (value instanceof Error) {
		const cause = (value as Error & { cause?: unknown }).cause;
		return {
			name: value.name,
			message: value.message,
			stack: value.stack,
			...(cause ? { cause } : {}),
		};
	}
	return value;
}

export const loggerInternals = {
	emit(level: Level, message: string, data: object, emitter = console) {
		emitter[level](message, JSON.stringify(data, replacer));
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
