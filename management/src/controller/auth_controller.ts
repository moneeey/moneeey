import { smtp_send_fn } from '../core';
import { APP_DESC, APP_FROM_EMAIL, APP_URL, HASH_PREFIX, MAX_AUTHENTICATION_SECONDS } from '../core/config';
import { connect_pouch_fn, pouch_db } from '../core/pouch';
import { IAuth, IUser } from '../entities';
import { hash_value, tick, uuid, validate_email } from '../core/utils';
import DatabaseController from './database_controller';

export default class AuthController extends DatabaseController {
  logger: Console
  smtp_send: smtp_send_fn

  constructor(logger: Console, connect_pouch: connect_pouch_fn, smtp_send: smtp_send_fn) {
    super(logger, connect_pouch)
    this.logger = logger
    this.smtp_send = smtp_send
  }

  async start(email: string) {
    const mainDb = this.connect_main_db()
    const user = await this.get_or_create_user(mainDb, email)

    const auth_code = this.generate_auth_code(email)
    const confirm_code = this.generate_auth_code(auth_code + email)
    const auth = { auth_code, confirm_code, created: tick(), updated: tick(), confirmed: false }

    this.logger.debug('start - saving user with new auth')
    await mainDb.put({...user,
      updated: tick(),
      auth: [...user.auth, auth],
    })

    const confirm_link = this.get_confirm_link(email, auth)
    const complete_email = this.get_complete_email(confirm_link)
    this.logger.debug('start - sending confirmation email')
    await this.send_email(email, `${APP_DESC} login`, complete_email)

    this.logger.debug('start - success')
    return { success: true, email, auth_code }
  }

  async authenticate(email: string, auth_code: string) {
    const mainDb = this.connect_main_db()
    const user = await this.get_or_create_user(mainDb, email)
    const auth = user.auth.find(auth => auth.auth_code === auth_code && auth.confirmed && auth.updated > tick() - MAX_AUTHENTICATION_SECONDS)
    if (auth) {
      auth.updated = tick()
      return user
    }
    return null
  }

  async check(email: string, auth_code: string) {
    const authenticated = await this.authenticate(email, auth_code)
    return { success: !!authenticated }
  }

  async complete(email: string, auth_code: string, confirm_code: string) {
    const mainDb = this.connect_main_db()
    const user = await this.get_or_create_user(mainDb, email)
    const auth = user?.auth.find(auth => auth.auth_code === auth_code)
    const error_code = (error: string) => {
      this.logger.error('complete - error_code', { email, error })
      return { success: false, error }
    }
    if (!auth) return error_code('auth_code')
    if (auth.confirm_code !== confirm_code) return error_code('confirm_code')
    if (auth.created < tick() - MAX_AUTHENTICATION_SECONDS) return error_code('code_expired')
    auth.confirmed = true
    await mainDb.put(user)
    return { success: true }
  }

  async logout(email: string, auth_code: string) {
    const mainDb = this.connect_main_db()
    const user = await this.get_or_create_user(mainDb, email)
    user.auth = user.auth.filter(auth => auth.auth_code !== auth_code)
    await mainDb.put(user)
    return { success: true }
  }

  hash_email(email: string): string {
    return hash_value(HASH_PREFIX, email, 128)
  }

  generate_auth_code(email: string): string {
    const auth_code = email + '_auth_' + uuid()
    return hash_value(HASH_PREFIX, auth_code, 256)
  }

  async send_email(to: string, subject: string, content: string) {
    this.logger.info('send_email', { to, subject });
    try {
      await this.smtp_send({ from: APP_FROM_EMAIL, to, subject, html: content });
    } catch (err) {
      this.logger.error('send_email', { err })
    }
  };

  get_confirm_link(email: string, auth: IAuth) {
    const link = `${APP_URL}/?auth_code=${auth.auth_code}&confirm_code=${auth.confirm_code}&email=${email}`;
    return `<a href="${link}">${link}</a>`;
  };

  get_complete_email(loginLink: string) {
    return `Please click the following link to complete your registration: ${loginLink}`;
  }

  async get_or_create_user(mainDb: pouch_db, email: string): Promise<IUser> {
    const userId = 'user_' + this.hash_email(email.toLowerCase())
    try {
      if (!validate_email(email)) {
        this.logger.error('invalid_email', { email })
        throw new Error('invalid_email')
      }
      this.logger.debug('get_or_create_user retrieve', { email })
      return await mainDb.get(userId) as IUser 
    } catch (err: any) {
      if (err?.status === 404) {
        this.logger.debug('get_or_create_user created default', { email })
        return {
          email,
          _id: userId,
          updated: tick(),
          created: tick(),
          auth: [],
          databases: [],
        } as IUser
      } else {
        this.logger.error('get_or_create_user', err)
        throw err
      }
    }
  }
}