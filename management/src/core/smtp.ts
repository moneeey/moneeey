import nodemailer, { SentMessageInfo } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { SMTP_URL } from './config';

const smtp_transport = () => nodemailer.createTransport(SMTP_URL);

const smtp_send = async (options: Mail.Options) => await smtp_transport().sendMail(options);
type smtp_send_fn = (options: Mail.Options) => Promise<SentMessageInfo>;

export { smtp_send, smtp_send_fn };
