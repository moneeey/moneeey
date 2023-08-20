import { mailInternals, sendEmail } from "./mail.ts";
import {
  assert,
  assertSnapshot,
  withSpying,
  withSpyingLogger,
} from "./test.ts";

Deno.test(async function sendEmailSuccess(test) {
  const stub = await withSpying({
    object: mailInternals,
    method: "fetch",
    action: async (stub) => {
      stub.resolves(new Response("ok", { status: 202 }));
      assert.assertEquals(
        await sendEmail({
          from: "from@email.com",
          to: "to@email.com",
          subject: "The Subect",
          html: "<p>html</p>",
          text: "the text",
        }),
        { success: true },
      );
    },
  });
  assertSnapshot(test, stub.args);
});

Deno.test(async function sendEmailFail() {
  await withSpyingLogger(async (logger) => {
    await withSpying({
      object: mailInternals,
      method: "fetch",
      action: async (stub) => {
        stub.resolves(new Response("internal error", { status: 500 }));
        assert.assertEquals(
          await sendEmail({
            from: "from@email.com",
            to: "to@email.com",
            subject: "The Subect",
            html: "<p>html</p>",
            text: "the text",
          }),
          {
            success: false,
          },
        );
      },
    });
    assert.assertEquals(
      logger.args,
      [
        ["error", "[mail] error", { error: "internal error" }],
      ],
    );
  });
});

Deno.test(async function sendEmailInternalsLogger() {
  await withSpyingLogger(async (logger) => {
    mailInternals.apiKey = "off";
    assert.assertEquals(
      await sendEmail({
        from: "from@email.com",
        to: "to@email.com",
        subject: "The Subect",
        html: "<p>html</p>",
        text: "the text",
      }),
      {
        success: true,
      },
    );
    assert.assertEquals(
      logger.args.map(([level, message]) => [level, message]),
      [["info", "[mail] fetch"]],
    );
  });
});

Deno.test(async function sendEmailInternalsFetch() {
  await withSpyingLogger(async (logger) => {
    mailInternals.apiKey = "FAKE-KEY";
    await withSpying({
      object: globalThis,
      method: "fetch",
      action: async (stub) => {
        stub.resolves(new Response("ok", { status: 202 }));
        assert.assertEquals(
          await sendEmail({
            from: "from@email.com",
            to: "to@email.com",
            subject: "The Subect",
            html: "<p>html</p>",
            text: "the text",
          }),
          {
            success: true,
          },
        );
        assert.assertEquals(stub.args.length, 1);
        assert.assertEquals(stub.args[0][1].headers, {
          "Content-Type": "application/json",
          Authorization: "Bearer FAKE-KEY",
        });
      },
    });
    assert.assertEquals(logger.args, []);
  });
});
