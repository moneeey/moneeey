import type { Database } from "../deps.ts";
import { Mutex, type SqlConn } from "./sql.ts";

type Bind = (string | number | bigint | boolean | null | Uint8Array)[];

export class SqliteConn implements SqlConn {
	readonly mutex = new Mutex();
	inUse = 0;

	constructor(readonly db: Database) {}

	query<T>(sql: string, ...params: unknown[]): Promise<T[]> {
		return Promise.resolve(
			this.db.prepare(sql).all(...(params as Bind)) as T[],
		);
	}

	get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
		return Promise.resolve(
			(this.db.prepare(sql).get(...(params as Bind)) as T | undefined) ??
				undefined,
		);
	}

	run(sql: string, ...params: unknown[]): Promise<number> {
		return Promise.resolve(this.db.prepare(sql).run(...(params as Bind)));
	}

	exec(sql: string): Promise<void> {
		this.db.exec(sql);
		return Promise.resolve();
	}

	async transaction<T>(fn: (tx: SqlConn) => Promise<T>): Promise<T> {
		this.db.exec("BEGIN");
		try {
			const result = await fn(this);
			this.db.exec("COMMIT");
			return result;
		} catch (err) {
			try {
				this.db.exec("ROLLBACK");
			} catch {
				/* already rolled back */
			}
			throw err;
		}
	}

	async exclusive<T>(fn: (conn: SqlConn) => Promise<T>): Promise<T> {
		this.inUse += 1;
		try {
			return await this.mutex.run(() => fn(this));
		} finally {
			this.inUse -= 1;
		}
	}

	close(): void {
		this.db.close();
	}
}
