import { SENDGRID_API_KEY } from "./config.ts";

type MailOptions = {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export const sendEmail = async ({
  from,
  to,
  subject,
  text,
  html,
}: MailOptions) => {
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY === "off") {
    console.log(
      "sendEmail",
      JSON.stringify({ from, to, subject, text, html }, false, 4),
    );
    return { success: true };
  }
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [
            {
              email: to,
            },
          ],
        },
      ],
      from: {
        email: from,
      },
      subject: subject,
      content: [
        {
          type: "text/plain",
          value: text,
        },
        {
          type: "text/html",
          value: html,
        },
      ],
    }),
  });
  if (res.status === 202) {
    return { success: true };
  } else {
    const error = await res.text();
    console.log("sendEmail error", { error });
    return { success: false };
  }
};
