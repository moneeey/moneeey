import {
	COUCHDB_ADMIN_PASSWORD,
	COUCHDB_ADMIN_USERNAME,
	COUCHDB_HOST,
} from "./config.ts";
import { Logger } from "./logger.ts";

const logger = Logger("couchdb");

async function dbApi(method: string, url: string, data?: object) {
	try {
		const body = data && JSON.stringify(data);
		return await fetch(`${COUCHDB_HOST}/${url}`, {
			body,
			method,
			headers: {
				Authorization:
					"Basic " +
					btoa(`${COUCHDB_ADMIN_USERNAME}:${COUCHDB_ADMIN_PASSWORD}`),
			},
		});
	} catch (e) {
		logger.error(`dbApi error ${method} ${url}`, { e });
	}
}

async function dbExists(dbName: string) {
	const req = await dbApi("HEAD", dbName);
	return req?.status === 200;
}

function dbCreate(dbName: string) {
	return dbApi("PUT", dbName, { id: dbName, name: dbName });
}

function dbSecurityApply(dbName: string, members: string[]) {
	return dbApi("PUT", `${dbName}/_security`, {
		members: { roles: ["_admin"], names: members },
		admins: { roles: ["_admin"] },
	});
}

export async function prepareUserDatabase(dbName: string, email: string) {
	if (!(await dbExists(dbName))) {
		logger.info("prepareUserDatabase create", { dbName });
		await dbCreate(dbName);
		await dbSecurityApply(dbName, [email]);
	}
}
