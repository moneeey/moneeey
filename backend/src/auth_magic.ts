import { APP_EMAIL, APP_URL } from "./config.ts";
import { prepareUserDatabase } from "./couchdb.ts";
import { jssha, oak } from "./deps.ts";
import { couchJwt, magicJwt } from "./jwt.ts";
import { sendEmail } from "./mail.ts";

function hash(value: string) {
  return new jssha("SHA3-384", "TEXT").update(value).getHash("HEX")
    .toLowerCase();
}

function validEmail(email: string) {
  email = email.toLowerCase().trim();
  if (!/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/.test(email)) {
    throw new Error("invalid email " + email);
  }
  return email;
}

async function authAndEnsureDbExists(
  strategy: string,
  email: string,
  userId: string,
) {
  if (!email || !userId) return { error: "no email or userId" };
  const db = strategy + "_" + hash(`${strategy}:${userId}:${email}`);
  await prepareUserDatabase(db, email);
  return {
    accessToken: await couchJwt.generate(
      email,
      { db },
      "36h",
    ),
  };
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
    const token = await magicJwt.generate(email, {}, "2h");
    const url = `${APP_URL}/api/magic/validate/${token}`;
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

  const validateMagic = async (jwtCode: string) => {
    const validatedJwt = await magicJwt.validate(jwtCode);
    const email = validatedJwt.payload.sub || "";
    return await authAndEnsureDbExists("magic", email, email);
  };

  authRouter.post("/magic/send", async (ctx) => {
    try {
      const email = await getBodyEmail(ctx);
      ctx.response.body = JSON.stringify(await sendMagic(email));
    } catch (err) {
      console.error("/magic/send error", { err });
      ctx.response.body = JSON.stringify({ error: "ops" });
      ctx.response.status = oak.Status.BadRequest;
    }
  });

  authRouter.get("/magic/validate/:jwtCode", async (ctx) => {
    try {
      const jwtCode = ctx.params["jwtCode"];
      ctx.response.body = JSON.stringify(await validateMagic(jwtCode));
    } catch (err) {
      console.error("/magic/validate error", { err });
      ctx.response.body = JSON.stringify({ error: "ops" });
      ctx.response.status = oak.Status.BadRequest;
    }
  });
}
