import { Database } from "../deps.ts";

export const ensureDir = async (filePath: string): Promise<void> => {
	const slash = filePath.lastIndexOf("/");
	if (slash <= 0) return;
	const dir = filePath.substring(0, slash);
	await Deno.mkdir(dir, { recursive: true });
};

export const openSqlite = (path: string): Database => {
	const db = new Database(path);
	db.exec("PRAGMA journal_mode = WAL;");
	db.exec("PRAGMA synchronous = NORMAL;");
	db.exec("PRAGMA foreign_keys = ON;");
	return db;
};
