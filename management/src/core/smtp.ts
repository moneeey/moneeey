import nodemailer from 'nodemailer'
import Mail from 'nodemailer/lib/mailer';

import parseBool from '../core';

const env = process.env

const smtp_configure = () => {
    let config: any = {
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT || '465'),
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD
        }
    }
    if (parseBool(env.SMTP_SECURE)) {
        config['secure'] = true
    }
    return config
}

const smtp_transport = () => nodemailer.createTransport(smtp_configure())

const smtp_send = async (options: Mail.Options) => await smtp_transport().sendMail(options)

export { smtp_send }
