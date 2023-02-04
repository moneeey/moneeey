import nodemailer from "nodemailer";
import fetch from "node-fetch";
import Mail from "nodemailer/lib/mailer";

import { SENDGRID_APIKEY, SMTP_URL } from "./config";

type MailOptions = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const smtp_transport = () => nodemailer.createTransport(SMTP_URL);
const smtp_send = async (options: Mail.Options) => {
  const res = await smtp_transport().sendMail(options);
  if (res.accepted === options.to) {
    return { success: true };
  } else {
    return { success: false, error: res.response };
  }
};

const sendgrid_send = async ({
  from,
  to,
  subject,
  text,
  html,
}: MailOptions) => {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_APIKEY}`,
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
    const ok = await res.text();
    return { success: true };
  } else {
    const error = await res.text();
    return { success: false, error };
  }
};

export const mail_send = ({
  from,
  to,
  text,
  html,
  subject,
}: MailOptions): Promise<{ success: boolean; error?: string }> => {
  if (SENDGRID_APIKEY) {
    return sendgrid_send({ from, to, html, text, subject });
  } else {
    return smtp_send({
      subject,
      from,
      to,
      html: html || text,
    });
  }
};

export type mail_send_fn = typeof mail_send;
