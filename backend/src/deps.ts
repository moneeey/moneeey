import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
	RegistrationResponseJSON,
} from "@simplewebauthn/server";
import Database from "better-sqlite3";
import * as dotenv from "dotenv";
import * as jose from "jose";

export { Database, dotenv, jose };
export {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
};
export type {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
	RegistrationResponseJSON,
};
