import PouchDB from 'pouchdb';
import hashjs from 'hash.js';
import * as Bacon from 'baconjs';

import { smtp_send } from './core'

const AUTH_CODE_SIZE = 32

const AUTH_MAX_TIME = 2 * 60 * 60 * 1000

type IID = string;

interface IEntity {
    _id: IID;
    _rev?: string;
    created: number;
    updated: number;
}

interface IDatabase {
    database_id: IID;
    level: number;
}

interface IAuth {
    confirm_code: string;
    code: string;
    created: number;
}

interface ILogin {
    email: string;
    auth: IAuth;
}

interface ISession {
    code: string;
    created: number;
}

interface MUser extends IEntity {
    email: string;
    databases: Array<IDatabase>;
    auth: Array<IAuth>;
    sessions: Array<ISession>;
}

class Management {
    logger: Console;

    constructor(logger?: any) {
        this.logger = logger || console
    }

    connect_default_db() {
        return this.connect_db(process.env.COUCHDB_DATABASE || '')
    }

    connect_db(dbName: string) {
        const host = `${process.env.COUCHDB_HOST}/${dbName}`;
        return new PouchDB(host, {
            auth: {
                username: process.env.COUCHDB_USERNAME,
                password: process.env.COUCHDB_PASSWORD,
            },
        });
    }

    tick() {
        return new Date().getTime()
    }

    hash_value(prefix: string, value: string, rounds: number) {
        const hsh = (input: string) => hashjs.sha512().update(prefix + input).digest('hex')
        return new Array(rounds).reduce((h, cur) => {
            return h + hsh(cur + h + value)
        }, hsh(value))
    }

    email_hash_prefix() {
        return process.env.EMAIL_HASH_PREFIX || ''
    }

    hash_email(email: string) {
        return this.hash_value(this.email_hash_prefix(), email, 128);
    }

    generate_auth_code(email: string, size: number) {
        const userId = this.hash_email(email)
        let result = ''
        while (result.length < size * 4) {
            let buffer = this.tick();
            buffer += userId;
            buffer += Math.random() * size * 99999;
            result = this.hash_value(this.email_hash_prefix(), buffer + result + buffer, 64) + result;
        }
        return result.substring(0, size)
    }

    async send_email(to: string, subject: string, content: string) {
        this.logger.log('send_email', { to, subject, content })
        await smtp_send({ from: 'Moneeey registration', to, subject, html: content })
    }

    get_link(loginInfo: ILogin) {
        const link = `${process.env.APP_URL}/auth/complete?code=${loginInfo.auth.confirm_code}&email=${loginInfo.email}`
        return `<a href="${link}">${link}</a>`
    }

    get_content(loginLink: string) {
        return `Please click the following link to complete your registration: ${loginLink}`
    }

    auth_start(email: string) {
        const db = this.connect_default_db()
        const emailId = this.hash_email(email)
        const userId = 'user_' + emailId
        return Bacon.once(0)
            .flatMap(() => Bacon.once(0)
                .flatMap(() => Bacon.fromPromise(db.get(userId)))
                .flatMapError(error => {
                    if (error.status === 404) {
                        return Bacon.once(0)
                            .flatMap(() => Bacon.fromPromise(db.put({
                                _id: userId,
                                created: this.tick(),
                                updated: this.tick(),
                                email,
                                auth: [],
                                databases: [],
                                sessions: [],
                            } as MUser)))
                            .flatMap(() => Bacon.fromPromise(db.get(userId)))
                    }
                    return new Bacon.Error(error)
                }))
            .flatMap((user: MUser) => {
                const updatedUser: MUser = {
                    ...user,
                    updated: this.tick(),
                    auth: [{
                        code: this.generate_auth_code(email, AUTH_CODE_SIZE),
                        confirm_code: this.generate_auth_code(email, AUTH_CODE_SIZE),
                        created: this.tick(),
                    }, ...user.auth],
                }
                const update = Bacon.fromPromise(db.put(updatedUser))
                const loginInfo: ILogin = { email: user.email, auth: updatedUser.auth[0] }
                return Bacon.combineTwo(update, Bacon.constant(loginInfo), (_updateResponse, info) => info)
            })
            .flatMap(loginInfo => {
                const loginLink = this.get_link(loginInfo)
                const sendEmail = Bacon.fromPromise(this.send_email(loginInfo.email, 'Moneeey registration', this.get_content(loginLink)))
                return Bacon.combineTwo(sendEmail, Bacon.constant(loginInfo), (_sendEmail, info) => info)
            })
            .flatMap(loginInfo => ({ status: 'started', login: loginInfo.auth.code }))
            .flatMapError(error => {
                this.logger.error('auth_start', { error })
                return { status: 'error' }
            })
            .take(1)
    }

    auth_complete(email: string, confirm_code: string) {
        const db = this.connect_default_db()
        const emailId = this.hash_email(email)
        const userId = 'user_' + emailId
        return Bacon.once(0)
            .flatMap(() => Bacon.fromPromise(db.get(userId)))
            .flatMap(userDoc => {
                const user = userDoc as unknown as MUser
                const auth = user.auth.find(auth => auth.confirm_code === confirm_code)
                if (!auth) return new Bacon.Error('confirmation_code_not_found')
                if (this.tick() - auth.created > AUTH_MAX_TIME) return new Bacon.Error('confirmation_code_expired')
                const updatedUser: MUser = {
                    ...user,
                    updated: this.tick(),
                    auth: user.auth.filter(cur => cur.confirm_code !== confirm_code && this.tick() - cur.created < AUTH_MAX_TIME),
                    sessions: [
                        { code: auth.code, created: this.tick(), }
                        , ...user.sessions],
                }
                return Bacon.fromPromise(db.put(updatedUser))
            })
            .flatMap(() => ({ status: 'confirmed' }))
            .flatMapError(error => {
                this.logger.error('auth_complete', { error })
                return { status: 'error' }
            })
            .take(1)
    }
}

export default Management
