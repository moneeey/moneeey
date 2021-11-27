import PouchDB from "pouchdb";
import hashjs from "hash.js";
import { v4 as uuid } from "uuid";
import * as Bacon from "baconjs";

const AUTH_CODE_SIZE = 32
const USERNAME_DB_LENGTH = 32
export const AUTH_MAX_TIME = 2 * 60 * 60 * 1000

type IID = string;

interface IEntity {
    _id: IID;
    _rev?: string;
    created: number;
    updated: number;
}

interface MUser extends IEntity {
    email: string;
    databases: Array<{
        database_id: IID;
        level: number;
    }>;
    auth: Array<{
        confirm_code: string; // sent to email
        code: string; // stored in browser, which keeps waiting for email to be confirmed
        created: number;
    }>;
    sessions: Array<{
        code: string;
        created: number;
    }>;
}

interface MDB extends IEntity {
    alias: string;
    name: string;
    user: string;
}

export default class Management {
    logger: Console;

    constructor(logger?: any) {
        this.logger = logger || console
    }

    connect_default_db() {
        return this.connect_db('' + process.env.COUCHDB_DATABASE)
    }

    connect_db(dbName: string) {
        return new PouchDB(process.env.COUCHDB_HOST + '/' + dbName, {
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
        return '' + process.env.EMAIL_HASH_PREFIX
    }

    hash_email(email: string) {
        return this.hash_value(this.email_hash_prefix(), email.toLowerCase(), 128);
    }

    generate_auth_code(email: string, size: number) {
        const userId = this.hash_email(email)
        let result = ''
        while (result.length < size * 4) {
            let buffer = '' + this.tick();
            buffer += userId;
            buffer += Math.random() * size * 99999;
            result = this.hash_value(this.email_hash_prefix(), buffer + result + buffer, 64) + result;
        }
        return result.substring(0, size)
    }

    async send_email(to: string, subject: string, content: string) {
        this.logger.log('send_email', { to, subject, content })
    }

    // create_database(email: string, password: string) {
    //     return Bacon.once(0)
    //         .flatMap(() => this.connect_db('_users'))
    //         .flatMap(usersDb => Bacon.retry({
    //             retries: 10,
    //             delay: () => 100,
    //             source: () => Bacon.once(0)
    //                 .flatMap(() => {
    //                     const user = this.generate_auth_code(email, USERNAME_DB_LENGTH)
    //                     const name = hashjs.utils.toHex(user)
    //                     const userId = "org.couchdb.user:" + user
    //                     const userDoc = { _id: userId, type: "user", name: user, password, roles: [], owner: email }
    //                     return { user, userId, name, userDoc }
    //                 })
    //                 .flatMap(user => Bacon.combine(
    //                     Bacon.constant(user),
    //                     Bacon.once(0)
    //                         .flatMap(() => Bacon.fromPromise(usersDb.get(user.userId)))
    //                         .flatMap(() => new Bacon.Error('userId already exists, trying another userId'))
    //                         .flatMapError(e => (e && e.status && e.status === 404) || new Bacon.Error(e))
    //                         .filter(true)
    //                         .flatMap(() => Bacon.fromPromise(usersDb.put(user.userDoc)))
    //                         .flatMap(() => true),
    //                     (user, created: boolean) => created && user
    //                 ))
    //         }))
    // }

    auth_complete(email: string, confirm_code: string) {
        const db = this.connect_default_db()
        const emailId = this.hash_email(email)
        const userId = 'user_' + emailId
        return Bacon.once(0)
            .flatMap(() => Bacon.fromPromise(db.get(userId)))
            .flatMap(userDoc => {
                const user = userDoc as unknown as MUser
                const auth = user.auth.find(auth => auth.confirm_code === confirm_code)
                if (!auth) return new Bacon.Error("confirmation_code_not_found")
                if (this.tick() - auth.created > AUTH_MAX_TIME) return new Bacon.Error("confirmation_code_expired")
                const updatedUser: MUser = { ...user,
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

    auth_start(Email: string) {
        const db = this.connect_default_db()
        const email = Email.toLowerCase();
        const emailId = this.hash_email(email)
        const userId = 'user_' + emailId
        return Bacon.once(0)
            .flatMap(() => Bacon.once(0)
                .flatMap(() => Bacon.fromPromise(db.get(userId)))
                .flatMapError(error => {
                    if (error.status === 404) {
                        return Bacon.fromPromise(db.put({
                                _id: userId,
                                created: this.tick(),
                                updated: this.tick(),
                                email: email,
                                auth: [],
                                databases: [],
                                sessions: [],
                            } as MUser))
                    }
                    return new Bacon.Error(error)
                }))
            .flatMap(userDoc => {
                const user = userDoc as MUser
                const updatedUser: MUser = { ...user,
                    updated: this.tick(),
                    auth: [{
                        code: this.generate_auth_code(email, AUTH_CODE_SIZE),
                        confirm_code: this.generate_auth_code(email, AUTH_CODE_SIZE),
                        created: this.tick(),
                    }, ...user.auth],
                }
                const update = Bacon.fromPromise(db.put(updatedUser))
                const loginInfo = { email: user.email, auth: updatedUser.auth[0] }
                return Bacon.combineTwo(update, Bacon.constant(loginInfo), (_updateResponse, info) => info)
            })
            .flatMap(loginInfo => {
                const loginLink = `${process.env.HOST}/auth/?code=${loginInfo.auth.confirm_code}&email=${loginInfo.email}`
                const sendEmail = Bacon.fromPromise(this.send_email(loginInfo.email, `Moneeey login`, `Please click the following link to complete your login ${loginLink}`))
                return Bacon.combineTwo(sendEmail, Bacon.constant(loginInfo), (_sendEmail, info) => info)
            })
            .flatMap(loginInfo => ({ status: 'started', login: loginInfo.auth.code }))
            .flatMapError(error => {
                this.logger.error('auth_start', { error })
                return { status: 'error' }
            })
            .take(1)
    }
}
