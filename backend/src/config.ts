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
export const MONEEEY_META_PATH = env.MONEEEY_META_PATH;
export const MONEEEY_VAULTS_DIR = env.MONEEEY_VAULTS_DIR;
const rawEnv = env.MONEEEY_ENV;
if (rawEnv !== "prod" && rawEnv !== "dev") {
	throw new Error(`MONEEEY_ENV must be "prod" or "dev", got: ${rawEnv}`);
}
export const MONEEEY_ENV: "prod" | "dev" = rawEnv;
export const MONEEEY_DB_ENGINE = env.MONEEEY_DB_ENGINE ?? "sqlite-per-vault";
export const MONEEEY_MAX_VAULT_HANDLES = Number(
	env.MONEEEY_MAX_VAULT_HANDLES ?? "3000",
);
export const MONEEEY_PG_URL = env.MONEEEY_PG_URL ?? "";
export const MONEEEY_PG_POOL_SIZE = Number(env.MONEEEY_PG_POOL_SIZE ?? "16");
export const JWT_SESSION_KEY_ID = env.JWT_SESSION_KEY_ID;
export const JWT_CHALLENGE_KEY_ID = env.JWT_CHALLENGE_KEY_ID;
export const JWT_AUTH_KEY_ID = env.JWT_AUTH_KEY_ID;
export const JWT_PRIVATE_KEY = env.JWT_PRIVATE_KEY;
export const JWT_PUBLIC_KEY = env.JWT_PUBLIC_KEY;

const appUrl = new URL(APP_URL);
export const WEBAUTHN_RP_ID = appUrl.hostname;
export const WEBAUTHN_RP_NAME = "Moneeey";
export const WEBAUTHN_ORIGIN = APP_URL;
