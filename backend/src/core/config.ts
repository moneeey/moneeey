import fs from 'fs';
import dotenv from 'dotenv';

const PROD_ENV_FILE = "/run/secret/prod.env";
const DEV_ENV_FILE = "/run/secret/dev.env";

if (fs.existsSync(PROD_ENV_FILE)) {
  dotenv.config({ path: PROD_ENV_FILE });
} else if (fs.existsSync(DEV_ENV_FILE)) {
  dotenv.config({ path: DEV_ENV_FILE });
} else {
  dotenv.config();
}

const env = (envName: string) => process.env[envName] as string;
const envList = (envName: string) => {
  let i = 1;
  let result = [];
  while (true) {
    let value = env(envName.replace("#", String(i++)));
    if (!value) {
      break;
    }
    result.push(value);
  }
  return result;
};
const envNumber = (envName: string) => parseInt(env(envName));

export const APP_DESC = "Moneeey";
export const APP_FROM_EMAIL = env("APP_FROM_EMAIL");

export const PORT: number = envNumber("PORT");
export const APP_URL: string = env("APP_URL");

export const COUCHDB_HOST: string = env("COUCHDB_HOST");
export const COUCHDB_MAIN_DATABASE: string = env("COUCHDB_MAIN_DATABASE");
export const COUCHDB_USERNAME: string = env("COUCHDB_USERNAME");
export const COUCHDB_PASSWORD: string = env("COUCHDB_PASSWORD");

const COUCHDB_REALM_HOST: string[] = envList("COUCHDB_REALM_#_HOST");
const COUCHDB_REALM_USERNAME: string[] = envList("COUCHDB_REALM_#_USERNAME");
const COUCHDB_REALM_PASSWORD: string[] = envList("COUCHDB_REALM_#_PASSWORD");

export const REALMS: { host: string; username: string; password: string }[] =
  COUCHDB_REALM_HOST.map((host, index) => ({
    host,
    username: COUCHDB_REALM_USERNAME[index],
    password: COUCHDB_REALM_PASSWORD[index],
  }));

export const HASH_PREFIX: string = env("HASH_PREFIX");
export const MAX_AUTHENTICATION_SECONDS: number = 48 * 60 * 60 * 1000;

export const SMTP_URL: string = env("SMTP_URL");
