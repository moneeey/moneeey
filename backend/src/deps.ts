import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@^13.0.0";
import type {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
	RegistrationResponseJSON,
} from "npm:@simplewebauthn/server@^13.0.0";
import * as dotenv from "https://deno.land/std@0.195.0/dotenv/mod.ts";
import * as fs from "https://deno.land/std@0.195.0/fs/mod.ts";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";
import * as oak from "https://deno.land/x/oak@v12.6.0/mod.ts";

export { dotenv, fs, jose, oak };
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
