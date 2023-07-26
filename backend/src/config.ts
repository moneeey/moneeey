import { dotenv, fs } from "./deps.ts";

const PROD_ENV_FILE = "/run/secret/prod.env";
const DEV_ENV_FILE = "/run/secret/dev.env";
const loadEnvFile = (envPath: string) => {
  if (fs.existsSync(envPath)) {
    return dotenv.loadSync({ envPath });
  }
  return null;
};

const env = loadEnvFile(PROD_ENV_FILE) || loadEnvFile(DEV_ENV_FILE) ||
  loadEnvFile(".env") || loadEnvFile(".env.example");

if (!env) {
  throw new Error(
    `Could not load ${PROD_ENV_FILE} || ${DEV_ENV_FILE} || .env || .env.example`,
  );
}

export const PORT = parseInt(env["PORT"]);
export const APP_EMAIL = env["APP_EMAIL"];
export const APP_URL = env["APP_URL"];
export const COUCHDB_HOST = env["COUCHDB_HOST"];
export const COUCHDB_ADMIN_USERNAME = env["COUCHDB_ADMIN_USERNAME"];
export const COUCHDB_ADMIN_PASSWORD = env["COUCHDB_ADMIN_PASSWORD"];
export const JWT_COUCH_KEY_ID = env["JWT_COUCH_KEY_ID"];
export const JWT_MAGIC_KEY_ID = env["JWT_MAGIC_KEY_ID"];
export const JWT_PRIVATE_KEY = env["JWT_PRIVATE_KEY"];
export const JWT_PUBLIC_KEY = env["JWT_PUBLIC_KEY"];
export const SENDGRID_API_KEY = env["SENDGRID_API_KEY"];
