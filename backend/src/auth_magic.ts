import { authenticateUser } from "./auth_couch.ts";
import { APP_EMAIL, APP_URL } from "./config.ts";
import { oak } from "./deps.ts";
import { magicJwt } from "./jwt.ts";
import { Logger } from "./logger.ts";
import { sendEmail } from "./mail.ts";

export const authMagicInternals = {
	sendEmail: sendEmail,
};

const getBodyEmail = async (ctx: oak.Context) => {
	const body = await ctx.request.body({ type: "json" }).value;
	let { email } = body as { email: string };
	email = email.toLowerCase().trim();
	if (!/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/.test(email)) {
		return false;
	}
	return email;
};

function respond(ctx: oak.Context, status: oak.Status, body: object) {
	ctx.response.body = JSON.stringify(body);
	ctx.response.status = status;
}

export function setupMagic(authRouter: oak.Router) {
	const sendMagic = async (email: string) => {
		const token = await magicJwt.generate(email, {}, "15min");
		const url = `${APP_URL}/api/auth/magic/validate/${token}`;
		await authMagicInternals.sendEmail({
			to: email,
			from: APP_EMAIL,
			subject: "Moneeey Login",
			html: `Click this link to login into Moneeey: <a href="${url}">${url}</a>`,
			text: `Click this link to login into Moneeey: ${url}`,
		});
		return { success: true, sent: email };
	};

	authRouter.post("/magic/send", async (ctx) => {
		try {
			const email = await getBodyEmail(ctx);
			if (email) {
				respond(ctx, oak.Status.OK, await sendMagic(email));
			} else {
				respond(ctx, oak.Status.BadRequest, { error: "bad email" });
			}
		} catch (err) {
			Logger("/magic/send").error("error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});

	const validateMagic = async (ctx: oak.Context, jwtCode: string) => {
		const validatedJwt = await magicJwt.validate(jwtCode);
		const email = validatedJwt.payload.sub;
		if (!email || email === "") {
			Logger("/magic/validate").error(
				"validateMagic jwt without sub/email",
				validatedJwt,
			);
			throw new Error("validateMagic jwt without sub/email");
		}
		return await authenticateUser(ctx, "magic", email, `magic:${email}`);
	};

	authRouter.get("/magic/validate/:jwtCode", async (ctx) => {
		try {
			const jwtCode = ctx.params.jwtCode;
			await validateMagic(ctx, jwtCode);
		} catch (err) {
			Logger("/magic/validate").error("error", { err });
			respond(ctx, oak.Status.InternalServerError, {
				error: "internal server error",
			});
		}
	});
}
