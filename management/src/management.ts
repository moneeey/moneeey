import PouchDB from "pouchdb";
import hashjs from "hash.js";
import * as Bacon from "baconjs";

const AUTH_CODE_SIZE = 64
const AUTH_DB_CODE_SIZE = 32
const AUTH_MAX_TIME = 2*60*60*1000

interface IEntity {
    _id: string;
    _rev?: string;
}

interface IAuthDoc extends IEntity {
    code: string;
    created: number;
}

interface IUserDoc extends IEntity {
    created: number;
    database: {
        name: string;
        user: string;
        password?: string;
    };
}

export default class Management {
    logger: Console;

    constructor(logger?: any) {
        this.logger = logger || console
    }

    connect_default_db() {
        return this.connect('' + process.env.COUCHDB_DATABASE)
    }

    connect(dbName: string) {
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

    hash_value(input: string) {
        return hashjs.sha512().update(input).digest('hex')
    }
    
    hash_email(email: string) {
        const prefix = process.env.EMAIL_HASH_PREFIX
        let result = email
        for(let i = 0; i < Math.floor(parseInt(process.env.EMAIL_ROUNDS || '64')); i++) {
           result = this.hash_value(prefix + result) 
        }
        return result
    }

    generate_auth_code(email: string, size: number) {
        const userId = this.hash_email(email)
        let randomCode = ''
        while (randomCode.length < size * 20) {
            randomCode += this.hash_value(randomCode + userId + this.tick() + Math.random() * Number.MAX_VALUE)
        }
        return randomCode.substring(Math.random() * (randomCode.length - size)).substring(0, size)
    }

    async send_email(to: string, subject: string, content: string) {
        this.logger.log('send_email', { to, subject, content })
    }

    async create_database(email: string) {
        const usersDb = this.connect('_users')
        const user = this.generate_auth_code(email, AUTH_DB_CODE_SIZE)
        const pass = this.generate_auth_code(email, 12)
        const name = hashjs.utils.toHex(user)
        return {
            database: { name, user, pass, },
            userDoc: await usersDb.put({
                _id: "org.couchdb.user:" + user,
                type: "user",
                name: user,
                password: pass,
                roles: [],
            })
        }
    }

    complete_login(db: PouchDB.Database, email: string, code: string) {
        const emailId = this.hash_email(email)
        const authId = 'authorize_' + emailId
        const userId = 'user_' + emailId
        return Bacon.once(0)
            .flatMap(() => Bacon.fromPromise(db.get(authId)))
            .flatMap(authDoc => {
                const auth = authDoc as unknown as IAuthDoc
                const time = this.tick() - auth.created
                return auth.code !== code ? new Bacon.Error('Auth code mismatch') :
                       time > AUTH_MAX_TIME ? new Bacon.Error('Auth expired') :
                       authDoc
            })
            .flatMap(authDoc => Bacon.fromPromise(db.remove(authDoc)))
            .flatMap(() => Bacon.fromPromise(db.get(userId)))
            .flatMapError(error => {
                if (error.status || error.status === 404 && error._id === userId) return new Bacon.Error(error)
                return Bacon.fromPromise(db.put({
                        _id: userId,
                        created: this.tick(),
                        database: this.create_database(email),
                    } as unknown as IUserDoc))
            })
            .flatMap(userDoc => (userDoc._rev && !userDoc.database && Bacon.fromPromise(db.get(userId))) || userDoc)
            .flatMap(userDoc => ({ status: 'ok', user: userDoc as unknown as IUserDoc}))
    }

    request_login(db: PouchDB.Database, email: string) {
        const emailId = this.hash_email(email)
        const authId = 'authorize_' + emailId
        return Bacon.once(0)
            .flatMap(() => Bacon.fromPromise(db.get(authId)))
            .flatMap(existing => Bacon.fromPromise(db.remove(existing)))
            .flatMapError(error => error.status !== 404 && new Bacon.Error(error))
            .flatMap(() => Bacon.fromPromise(db.put({
                _id: authId,
                code:this.generate_auth_code(email, AUTH_CODE_SIZE),
                epooch: this.tick(),
            })))
            .flatMap(() => Bacon.fromPromise(db.get(authId)))
            .flatMap((authDoc) => `${process.env.HOST}/auth/?code=${(authDoc as unknown as IAuthDoc).code}&email=${email}`)
            .flatMap(loginLink => Bacon.fromPromise(this.send_email(email, `Moneeey login`, `Please click the following link to complete your login ${loginLink}`)))
            .flatMap(() => ({ status: 'ok' }))
            .doError(error => this.logger.error('request_login', { error }))
    }
}