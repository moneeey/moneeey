export type LogLevel = "log" | "info" | "warn" | "error";
export type LogListener = (
	level: LogLevel,
	text: string,
	...args: unknown[]
) => void;

const LogWeight: Record<LogLevel, number> = {
	log: 10,
	info: 20,
	warn: 30,
	error: 40,
};

class BaseLogger {
	listeners: LogListener[] = [];

	name: string;

	parent: Logger | undefined;

	level: LogLevel = "log";

	constructor(name: string, parent?: Logger) {
		this.name = name;
		this.parent = parent;
	}

	emit(level: LogLevel, _text: string, ...args: unknown[]) {
		if (LogWeight[level] >= LogWeight[this.level]) {
			const text = `${this.name}:${_text}`;
			if (this.parent) {
				this.parent.emit(level, text, ...args);
			} else {
				for (const listen of this.listeners) {
					listen(level, text, ...args);
				}
			}
		}
	}

	listen(listener: LogListener) {
		this.listeners.push(listener);
	}

	warn(text: string, ...args: unknown[]) {
		this.emit("warn", text, ...args);
	}

	info(text: string, ...args: unknown[]) {
		this.emit("info", text, ...args);
	}

	error(text: string, ...args: unknown[]) {
		this.emit("error", text, ...args);
	}

	log(text: string, ...args: unknown[]) {
		this.emit("log", text, ...args);
	}
}

export default class Logger extends BaseLogger {
	constructor(name: string, parent?: Logger) {
		super(name, parent);
		this.listen((level: LogLevel, ...args: unknown[]) =>
			console?.[level](...args),
		);
	}
}

export class MockLogger extends BaseLogger {
	calls = [] as object[];

	constructor(name: string, parent?: Logger) {
		super(name, parent);
		this.listen((level, text, ...args) =>
			this.calls.push({ level, text, args }),
		);
	}
}
