import { fs, dotenv } from "./deps.ts";

const ENV_FILES = [
	"/run/secret/prod.env",
	"/run/secret/dev.env",
	"env",
	"env.example",
];

const loadEnvFile = (envPath?: string) => {
	if (envPath) {
		return dotenv.loadSync({ envPath });
	}
	return null;
};

const env = loadEnvFile(ENV_FILES.find((fileName) => fs.existsSync(fileName)));

if (!env) {
	throw new Error(`Could not load env file, tried ${ENV_FILES.join(" || ")}`);
}

export const PORT = Number.parseInt(env.PORT);
export const APP_URL = env.APP_URL;
export const COUCHDB_HOST = env.COUCHDB_HOST;
export const COUCHDB_ADMIN_USERNAME = env.COUCHDB_USER;
export const COUCHDB_ADMIN_PASSWORD = env.COUCHDB_PASSWORD;
export const JWT_COUCH_KEY_ID = env.JWT_COUCH_KEY_ID;
export const JWT_CHALLENGE_KEY_ID = env.JWT_CHALLENGE_KEY_ID;
export const JWT_AUTH_KEY_ID = env.JWT_AUTH_KEY_ID;
export const JWT_PRIVATE_KEY = env.JWT_PRIVATE_KEY;
export const JWT_PUBLIC_KEY = env.JWT_PUBLIC_KEY;

const appUrl = new URL(APP_URL);
export const WEBAUTHN_RP_ID = appUrl.hostname;
export const WEBAUTHN_RP_NAME = "Moneeey";
export const WEBAUTHN_ORIGIN = APP_URL;
