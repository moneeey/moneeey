import {
	assert,
	assertEquals,
} from "https://deno.land/std@0.195.0/assert/mod.ts";
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "../src/deps.ts";
import type {
	AuthenticationResponseJSON,
	RegistrationResponseJSON,
} from "../src/deps.ts";
import { makeAssertion, makeRegistration } from "./webauthn.ts";

const ORIGIN = "http://localhost:4280";
const RP_ID = "localhost";

Deno.test("software authenticator passes register + login verification", async () => {
	const regOptions = await generateRegistrationOptions({
		rpName: "Moneeey",
		rpID: RP_ID,
		userName: "loadtest-00001",
		userDisplayName: "loadtest-00001",
		attestationType: "none",
		authenticatorSelection: {
			residentKey: "required",
			userVerification: "preferred",
		},
	});

	const { credentialJSON, credential } = await makeRegistration(
		{
			challenge: regOptions.challenge,
			rp: { id: regOptions.rp.id ?? RP_ID, name: regOptions.rp.name },
			user: {
				id: regOptions.user.id,
				name: regOptions.user.name,
				displayName: regOptions.user.displayName,
			},
		},
		ORIGIN,
	);

	const regVerification = await verifyRegistrationResponse({
		response: credentialJSON as unknown as RegistrationResponseJSON,
		expectedChallenge: regOptions.challenge,
		expectedOrigin: ORIGIN,
		expectedRPID: RP_ID,
	});
	assert(regVerification.verified);
	assert(regVerification.registrationInfo);

	const stored = regVerification.registrationInfo.credential;

	const authOptions = await generateAuthenticationOptions({
		rpID: RP_ID,
		userVerification: "preferred",
	});

	const assertion = await makeAssertion(
		{ challenge: authOptions.challenge, rpId: authOptions.rpId ?? RP_ID },
		credential,
		ORIGIN,
		credential.counter + 1,
	);

	const authVerification = await verifyAuthenticationResponse({
		response: assertion as unknown as AuthenticationResponseJSON,
		expectedChallenge: authOptions.challenge,
		expectedOrigin: ORIGIN,
		expectedRPID: RP_ID,
		credential: {
			id: stored.id,
			publicKey: stored.publicKey,
			counter: stored.counter,
			transports: undefined,
		},
	});
	assert(authVerification.verified);
	assertEquals(authVerification.authenticationInfo.newCounter, 1);
});
