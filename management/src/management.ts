import PouchDB from 'pouchdb';
import hashjs from 'hash.js';
import * as Bacon from 'baconjs';

import { APP_DESC, smtp_send } from './core';

import { IAuth, ILogin, ISession, IUser } from './entities';

const AUTH_CODE_SIZE = 32;

const AUTH_MAX_TIME = 2 * 60 * 60 * 1000;

const env = process.env;

class Management {
  logger: Console;

  constructor(logger?: any) {
    this.logger = logger || console;
  }

  connect_db = (dbName: string) => {
    let host = env.COUCHDB_URL || '';
    const lastSep = host.lastIndexOf('/');
    if (lastSep > 0) {
      host = host.substring(0, lastSep + 1) + dbName;
    }
    return new PouchDB(host);
  };

  connect_default_db = () => this.connect_db(APP_DESC.toLowerCase());

  tick = () => new Date().getTime();

  hash_value = (prefix: string, value: string, rounds: number) => {
    const hsh = (input: string) =>
      hashjs
        .sha512()
        .update(prefix + input)
        .digest('hex');
    return new Array(rounds).reduce((h, cur) => h + hsh(cur + h + value), hsh(value));
  };

  auth_hash_prefix = () => env.AUTH_HASH_PREFIX || '';

  hash_email = (email: string) => this.hash_value(this.auth_hash_prefix(), email, 128);

  generate_auth_code = (email: string, size: number) => {
    let result = '';
    while (result.length < size * 4) {
      let buffer = this.tick();
      buffer += this.hash_email(email);
      buffer += Math.random() * size * 99999;
      result = this.hash_value(this.auth_hash_prefix(), buffer + result + buffer, 64) + result;
    }
    return result.substring(0, size);
  };

  send_email = async (to: string, subject: string, content: string) => {
    this.logger.log('send_email', { to, subject, content });
    await smtp_send({ from: `${APP_DESC} registration`, to, subject, html: content });
  };

  get_link = (loginInfo: ILogin) => {
    const link = `${env.AUTH_URL}/auth/complete?confirm_code=${loginInfo.auth.confirm_code}&email=${loginInfo.email}`;
    return `<a href="${link}">${link}</a>`;
  };

  get_content = (loginLink: string) => `Please click the following link to complete your registration: ${loginLink}`;

  auth_start = (email: string) => {
    const db = this.connect_default_db();
    const userId = 'user_' + this.hash_email(email);
    return Bacon.once(0)
      .flatMap(() =>
        Bacon.once(0)
          .flatMap(() => Bacon.fromPromise(db.get(userId)))
          .flatMapError((error) => {
            if (error.status === 404) {
              return Bacon.once(0)
                .flatMap(() =>
                  Bacon.fromPromise(
                    db.put({
                      _id: userId,
                      created: this.tick(),
                      updated: this.tick(),
                      email,
                      auth: [],
                      databases: [],
                      sessions: []
                    } as IUser)
                  )
                )
                .flatMap(() => Bacon.fromPromise(db.get(userId)));
            }
            return new Bacon.Error(error);
          })
      )
      .flatMap((user: IUser) => {
        const updatedUser: IUser = {
          ...user,
          updated: this.tick(),
          auth: [
            {
              code: this.generate_auth_code(email, AUTH_CODE_SIZE),
              confirm_code: this.generate_auth_code(email, AUTH_CODE_SIZE),
              created: this.tick()
            } as IAuth,
            ...user.auth
          ]
        };
        const update = Bacon.fromPromise(db.put(updatedUser));
        const loginInfo: ILogin = { email: user.email, auth: updatedUser.auth[0] };
        return Bacon.combineTwo(update, Bacon.constant(loginInfo), (_, info) => info);
      })
      .flatMap((loginInfo: ILogin) => {
        const loginLink = this.get_link(loginInfo);
        const sendEmail = Bacon.fromPromise(
          this.send_email(loginInfo.email, `${APP_DESC} registration`, this.get_content(loginLink))
        );
        return Bacon.combineTwo(sendEmail, Bacon.constant(loginInfo), (_, info) => info);
      })
      .flatMap(
        (loginInfo: ILogin) =>
          ({
            status: 'started',
            code: loginInfo.auth.code,
            confirm_code: loginInfo.auth.confirm_code
          } as IAuth)
      )
      .flatMapError((error) => {
        this.logger.error('auth_start', { error });
        return { status: 'error' };
      })
      .take(1);
  };

  auth_complete(email: string, confirm_code: string) {
    const db = this.connect_default_db();
    const userId = 'user_' + this.hash_email(email);
    return Bacon.once(0)
      .flatMap(() => Bacon.fromPromise(db.get(userId)))
      .flatMap((userDoc: IUser | unknown) => {
        const user = userDoc as IUser;
        const auth = user.auth.find((auth: IAuth) => auth.confirm_code === confirm_code);
        if (!auth) {
          return new Bacon.Error('confirmation_code_not_found');
        }
        if (this.tick() - auth.created > AUTH_MAX_TIME) {
          return new Bacon.Error('confirmation_code_expired');
        }
        const session: ISession = { code: auth.code, created: this.tick() };
        const updatedUser: IUser = {
          ...user,
          updated: this.tick(),
          auth: user.auth.filter(
            (cur) => cur.confirm_code !== confirm_code && this.tick() - cur.created < AUTH_MAX_TIME
          ),
          sessions: [session, ...user.sessions]
        };
        const update = Bacon.fromPromise(db.put(updatedUser));
        return Bacon.combineTwo(update, Bacon.constant(session), (_, info) => info);
      })
      .flatMap((session) => ({ status: 'confirmed', session }))
      .flatMapError((error) => {
        this.logger.error('auth_complete', { error });
        return { status: 'error' };
      })
      .take(1);
  }
}

export { AUTH_MAX_TIME, Management };
