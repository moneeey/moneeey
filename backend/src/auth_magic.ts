import { authenticateUser } from "./auth_couch.ts";
import { APP_EMAIL, APP_URL } from "./config.ts";
import { oak } from "./deps.ts";
import { magicJwt } from "./jwt.ts";
import { sendEmail } from "./mail.ts";

function validEmail(email: string) {
  email = email.toLowerCase().trim();
  if (!/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/.test(email)) {
    throw new Error("invalid email " + email);
  }
  return email;
}

export function setupMagic(
  authRouter: oak.Router,
) {
  const getBodyEmail = async (ctx: oak.Context) => {
    const body = await ctx.request.body({ type: "json" }).value;
    const { email } = body as { email: string };
    return validEmail(email);
  };

  const sendMagic = async (email: string) => {
    const token = await magicJwt.generate(email, {}, "15min");
    const url = `${APP_URL}/api/auth/magic/validate/${token}`;
    const body = `Click this link to login into Moneeey: ${url}`;
    await sendEmail({
      to: email,
      from: APP_EMAIL,
      subject: "Moneeey Login",
      html: body,
      text: body,
    });
    return { sent: email };
  };

  const validateMagic = async (ctx: oak.Context, jwtCode: string) => {
    const validatedJwt = await magicJwt.validate(jwtCode);
    const email = validatedJwt.payload.sub || "";
    return authenticateUser(ctx, 'magic', email, `magic:${email}`);
  };

  authRouter.post("/magic/send", async (ctx: oak.Context) => {
    try {
      const email = await getBodyEmail(ctx);
      ctx.response.body = JSON.stringify(await sendMagic(email));
    } catch (err) {
      console.error("/magic/send error", { err });
      ctx.response.body = JSON.stringify({ error: "ops" });
      ctx.response.status = oak.Status.BadRequest;
    }
  });

  authRouter.get("/magic/validate/:jwtCode", async (ctx: oak.Context) => {
    try {
      const jwtCode = ctx.params["jwtCode"];
      ctx.response.body = JSON.stringify(await validateMagic(ctx, jwtCode));
    } catch (err) {
      console.error("/magic/validate error", { err });
      ctx.response.body = JSON.stringify({ error: "ops" });
      ctx.response.status = oak.Status.BadRequest;
    }
  });
}
