import {
	COUCHDB_ADMIN_PASSWORD,
	COUCHDB_ADMIN_USERNAME,
	COUCHDB_HOST,
} from "./config.ts";
import { Logger } from "./logger.ts";

const logger = Logger("couchdb");

export async function dbApi(method: string, url: string, data?: object) {
	try {
		const body = data && JSON.stringify(data);
		return await fetch(`${COUCHDB_HOST}/${url}`, {
			body,
			method,
			headers: {
				Authorization: `Basic ${btoa(`${COUCHDB_ADMIN_USERNAME}:${COUCHDB_ADMIN_PASSWORD}`)}`,
				"Content-Type": "application/json",
			},
		});
	} catch (e) {
		logger.error(`dbApi error ${method} ${url}`, { e });
	}
}

export async function dbExists(dbName: string) {
	const req = await dbApi("HEAD", dbName);
	return req?.status === 200;
}

export function dbCreate(dbName: string) {
	return dbApi("PUT", dbName, { id: dbName, name: dbName });
}

export function dbSecurityApply(dbName: string, members: string[]) {
	return dbApi("PUT", `${dbName}/_security`, {
		members: { roles: ["_admin"], names: members },
		admins: { roles: ["_admin"] },
	});
}

export async function dbSecurityAddMember(dbName: string, email: string) {
	const resp = await dbApi("GET", `${dbName}/_security`);
	if (!resp || resp.status !== 200) {
		throw new Error(`failed to read security for ${dbName}`);
	}
	const security = await resp.json();
	const members: string[] = security.members?.names || [];
	if (!members.includes(email)) {
		members.push(email);
	}
	return dbSecurityApply(dbName, members);
}

export async function prepareUserDatabase(dbName: string, email: string) {
	if (!(await dbExists(dbName))) {
		logger.info("prepareUserDatabase create", { dbName });
		await dbCreate(dbName);
		await dbSecurityApply(dbName, [email]);
	}
}

export async function createUserDatabase(
	dbName: string,
	email: string,
): Promise<boolean> {
	const resp = await dbCreate(dbName);
	if (!resp) {
		throw new Error(`createUserDatabase network error for ${dbName}`);
	}
	if (resp.status === 201 || resp.status === 202) {
		await dbSecurityApply(dbName, [email]);
		return true;
	}
	if (resp.status === 412 || resp.status === 409) {
		return false;
	}
	const body = await resp.text();
	throw new Error(
		`createUserDatabase failed for ${dbName}: ${resp.status} ${body}`,
	);
}

export const couchdbInternals = {
	dbApi,
	dbExists,
	dbCreate,
	dbSecurityApply,
	dbSecurityAddMember,
	prepareUserDatabase,
	createUserDatabase,
};
