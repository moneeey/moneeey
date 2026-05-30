export interface SqlConn {
	query<T>(sql: string, ...params: unknown[]): Promise<T[]>;
	get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
	run(sql: string, ...params: unknown[]): Promise<number>;
	exec(sql: string): Promise<void>;
	transaction<T>(fn: (tx: SqlConn) => Promise<T>): Promise<T>;
}

export class Mutex {
	private tail: Promise<unknown> = Promise.resolve();

	run<T>(fn: () => Promise<T> | T): Promise<T> {
		const result = this.tail.then(() => fn());
		this.tail = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}
}
