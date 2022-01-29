import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

const env = process.env;

const smtp_transport = () => nodemailer.createTransport(env.SMTP_URL);

const smtp_send = async (options: Mail.Options) => await smtp_transport().sendMail(options);

export { smtp_send };
