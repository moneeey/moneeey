import { APP_URL } from "./config.ts";
import { prepareUserDatabase } from "./couchdb.ts";
import { jssha, oak } from "./deps.ts";
import { authJwt, couchJwt } from "./jwt.ts";

const authenticationDuration = '48h'

function hash(value: string) {
  return new jssha("SHA3-384", "TEXT").update(value).getHash("HEX")
    .toLowerCase();
}

export async function authAndEnsureDbExists(
  strategy: string,
  email: string,
  userId: string,
) {
  if (!email || !userId) return { error: "no email or userId" };
  const db = strategy + "_" + hash(`${strategy}:${userId}:${email}`);
  await prepareUserDatabase(db, email);
  return {
    authenticated: true,
    database: db,
    accessToken: await couchJwt.generate(
      email,
      { db },
      "36h",
    ),
  };
}

export async function authenticateUser(ctx: oak.Context, strategy: string, email: string, userId: string) {
  const authToken = await authJwt.generate(email, { strategy, userId }, authenticationDuration);
  ctx.cookies.set("authToken", authToken, {
    httpOnly: true,
  });
  ctx.response.redirect(APP_URL)
  return true
}

export function setupCouch(
  authRouter: oak.Router,
) {
  const authCouch = async (authToken: string) => {
    const validatedJwt = await authJwt.validate(authToken);
    const email = validatedJwt.payload.sub || "";
    const strategy = validatedJwt.payload.strategy || "";
    const userId = validatedJwt.payload.userId || "";
    if (email && strategy && userId) {
      return authAndEnsureDbExists(strategy, email, userId);
    } else {
      return { authenticated: false }
    }
  };

  authRouter.post("/couch", async (ctx: oak.Context) => {
    try {
      const authToken = await ctx.cookies.get("authToken");
      if (authToken && authToken.length > 0) {
        ctx.response.body = JSON.stringify(await authCouch(authToken));
      } else {
        ctx.response.body = JSON.stringify({ authenticated: false })
        ctx.response.status = oak.Status.Unauthorized
      }
    } catch (err) {
      console.error("/couch", { err });
      ctx.response.body = JSON.stringify({ error: "ops" });
      ctx.response.status = oak.Status.BadRequest;
    }
  });

  authRouter.post("/logout", async (ctx: oak.Context) => {
    try {
      ctx.cookies.delete("authToken");
      ctx.response.body = JSON.stringify({ authenticated: false });
    } catch (err) {
      console.error("/couch", { err });
      ctx.response.body = JSON.stringify({ error: "ops" });
      ctx.response.status = oak.Status.BadRequest;
    }
  });
}
