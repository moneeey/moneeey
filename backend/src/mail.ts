import { SENDGRID_API_KEY } from "./config.ts";
import { Logger } from "./logger.ts";

const logger = Logger("mail");

type MailOptions = {
	from: string;
	to: string;
	subject: string;
	text?: string;
	html?: string;
};

export const mailInternals = {
	apiKey: SENDGRID_API_KEY,
	fetch: (url: string, options: RequestInit) => {
		if (!mailInternals.apiKey || mailInternals.apiKey === "off") {
			logger.info("fetch", { url, options });
			return Promise.resolve(new Response("local sent", { status: 202 }));
		}
		return fetch(url, options);
	},
};

export const sendEmail = async ({
	from,
	to,
	subject,
	text,
	html,
}: MailOptions) => {
	const res = await mailInternals.fetch(
		"https://api.sendgrid.com/v3/mail/send",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${mailInternals.apiKey}`,
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
		},
	);
	if (res.status === 202) {
		return { success: true };
	}
	const error = await res.text();
	Logger("mail").error("error", { error });
	return { success: false };
};
