import { jwtInternals } from "./jwt.ts";
import { authMagicInternals } from "./auth_magic.ts";
import {
  assert,
  assertResponse,
  runServerRequest,
  withSpying,
  withSpyingLogger,
} from "./test.ts";

function assertAuthTokenCookie(resp: Response, hasToken: boolean) {
  return assert.assertEquals(
    !!resp.headers.getSetCookie().find((cookie) =>
      cookie.startsWith("authToken=")
    ),
    hasToken,
  );
}

Deno.test(async function magicSendSuccess() {
  const email = "fernando@baroni.tech";
  await withSpying({
    object: jwtInternals,
    method: "generateJwt",
    expect: [
      [
        {
          claims: {},
          email,
          expirationTime: "15min",
          keyId: "moneeeymagic",
        },
      ],
    ],
    action: async (generateJwtStub) => {
      generateJwtStub.resolves("a.b.c");
      const url = "http://local.moneeey.io:4280/api/auth/magic/validate/a.b.c";
      return await withSpying({
        object: authMagicInternals,
        method: "sendEmail",
        expect: [
          [{
            from: "app@moneeey.io",
            html:
              `Click this link to login into Moneeey: <a href="${url}">${url}</a>`,
            subject: "Moneeey Login",
            text: `Click this link to login into Moneeey: ${url}`,
            to: email,
          }],
        ],
        action: async (sendEmailStub) => {
          sendEmailStub.resolves({ success: true });
          const { resp } = await runServerRequest(
            "POST",
            "/api/auth/magic/send",
            { email },
          );
          assertResponse(resp, 200, {
            success: true,
            sent: email,
          });
        },
      });
    },
  });
});

Deno.test(async function magicSendBadEmail() {
  const email = "not_valid!#email";
  const { resp } = await runServerRequest(
    "POST",
    "/api/auth/magic/send",
    { email },
  );
  assertResponse(resp, 400, {
    error: "bad email",
  });
});

Deno.test(async function magicSendSendMailError() {
  const email = "invalid@send.tech";
  await withSpying({
    object: jwtInternals,
    method: "generateJwt",
    expect: [
      [
        {
          claims: {},
          email,
          expirationTime: "15min",
          keyId: "moneeeymagic",
        },
      ],
    ],
    action: async (generateJwtStub) => {
      generateJwtStub.resolves("a.b.c");
      const url = "http://local.moneeey.io:4280/api/auth/magic/validate/a.b.c";
      return await withSpying({
        object: authMagicInternals,
        method: "sendEmail",
        expect: [
          [{
            from: "app@moneeey.io",
            html:
              `Click this link to login into Moneeey: <a href="${url}">${url}</a>`,
            subject: "Moneeey Login",
            text: `Click this link to login into Moneeey: ${url}`,
            to: email,
          }],
        ],
        action: async (sendEmailStub) => {
          sendEmailStub.rejects({ server_exploded: true });
          return await withSpyingLogger(async (logger) => {
            const { resp } = await runServerRequest(
              "POST",
              "/api/auth/magic/send",
              { email },
            );
            assertResponse(resp, 500, {
              error: "internal server error",
            });
            assert.assertEquals(logger.args, [
              [
                "error",
                "[/magic/send] error",
                {
                  err: {
                    server_exploded: true,
                  },
                },
              ],
            ]);
          });
        },
      });
    },
  });
});

Deno.test(async function magicSendAndValidates() {
  const email = "valid@baroni.tech";
  await withSpying({
    object: authMagicInternals,
    method: "sendEmail",
    action: async (sendEmailStub) => {
      sendEmailStub.resolves({ success: true });
      const { resp } = await runServerRequest(
        "POST",
        "/api/auth/magic/send",
        { email },
      );
      assertResponse(resp, 200, {
        sent: email,
        success: true,
      });
      assert.assert(sendEmailStub.calledOnce);
      const emailBody = sendEmailStub.args[0][0].text;
      const url = emailBody.substring(emailBody.indexOf("/api"));
      const { resp: validateResp } = await runServerRequest("GET", url);
      assert.assertEquals(validateResp.status, 302); // redirect
      assert.assertEquals(
        await validateResp.text(),
        'Redirecting to <a href="http://local.moneeey.io:4280">http://local.moneeey.io:4280</a>.',
      );
      assertAuthTokenCookie(validateResp, true);
    },
  });
});

Deno.test(async function magicValidatesBadToken() {
  const url = "/api/auth/magic/validate/bad.jwt.token";
  await withSpyingLogger(async (logger) => {
    const { resp } = await runServerRequest("GET", url);

    assertResponse(resp, 500, {
      error: "internal server error",
    });
    assertAuthTokenCookie(resp, false);

    assert.assertEquals(
      logger.args.map(([level, message]) => [level, message]),
      [
        [
          "error",
          "[/magic/validate] error",
        ],
      ],
    );
  });
});
