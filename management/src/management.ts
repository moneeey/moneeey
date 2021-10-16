import PouchDB from "pouchdb";
import hashjs from "hash.js";
import * as Bacon from "baconjs";

const AUTH_CODE_SIZE = 64
const AUTH_DB_CODE_SIZE = 32
const AUTH_MAX_TIME = 2*60*60*1000

interface IEntity {
    _id: string;
    _rev: string;
}

interface IAuthDoc extends IEntity {
    code: string;
    created: number;
}

interface IUserDoc extends IEntity {
    database: {
        user: string;
        password?: string;
    };
}

export default class Management {
    connect(dbName?: string) {
        return new PouchDB(process.env.COUCHDB_HOST + '/' + (dbName || process.env.COUCHDB_DATABASE), {
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
        console.log('send_email', { to, subject, content })
    }

    async create_database(email: string) {
        const usersDb = this.connect('_users')
        const user = this.generate_auth_code(email, AUTH_DB_CODE_SIZE)
        const pass = this.generate_auth_code(email, 12)
        await usersDb.put({
            _id: "org.couchdb.user:" + user,
            type: "user",
            name: user,
            password: pass,
            roles: [],
        })
        return {
            databaseId: hashjs.utils.toHex(user),
            user,
            pass,
        }
    }

    async get_user_doc(db: PouchDB.Database, email: string) {
        const userId = this.hash_email(email)
        const id = 'user_' + userId
        let doc
        try {
            console.info('fetching user')
            doc = await db.get(id)
        } catch (e) {
            console.info('error fetching user')
            console.error({erroooor: e})
            if (e.status === 404) {
                console.info('creating user')
                doc = await db.put({
                    _id: id,
                    created: this.tick(),
                    database: await this.create_database(email),
                })
            } else {
                throw e
            }
        }
        return doc
    }

    async authorize(email: string, code: string) {
        const db = this.connect();
        let response
        try {
            const userId = this.hash_email(email)
            const id = 'authorize_' + userId
            const authDoc = await db.get(id) as IAuthDoc
            if (code === authDoc.code) {
                const timeSinceAuth = this.tick() - authDoc.created
                if(timeSinceAuth < AUTH_MAX_TIME) {
                    await db.remove(authDoc)
                    const userDoc = await this.get_user_doc(db, email)
                    response = {status: 'ok', data: { database: userDoc.database }}
                } else {
                    response = {status: 'error', reason: 'authorize_timeout'}
                }
            } else {
                response = {status: 'error', reason: 'authorize_code_mismatch'}
            }
        } catch(e) {
            response = {status: 'error', reason: 'authorize_other'}
            console.error({response, error: e})
        }
        return response
    }


    async create_auth_for(db: PouchDB.Database, email: string, authId: string) {
        return Bacon.once(undefined)
            .flatMap(() => this.generate_auth_code(email, AUTH_CODE_SIZE))
            .flatMap(code => ({
                doc: db.put({_id: authId, code, epooch: this.tick()}),
                code,
            }))
            .flatMap(({ code }) => `${process.env.HOST}/auth/?code=${code}&email=${email}`)
            .flatMap(loginLink => this.send_email(email, `Moneeey login`, `Please click the following link to complete your login ${loginLink}`))
            .flatMap(() => ({ status: 'ok' }))
    }

    request_login(db: PouchDB.Database, email: string) {
        const userId = this.hash_email(email)
        const authId = 'authorize_' + userId
        return Bacon.once(undefined)
            .doLog()
            .flatMap(() => Bacon.fromPromise(db.get(authId)))
            .doLog()
            .flatMap(existing => Bacon.fromPromise(db.remove(existing)))
            .doLog()
            .flatMapError(error => error.status === 404 ? Bacon.once(undefined) : new Bacon.Error(error))
            .doLog()
            // .flatMapConcat(() => this.create_auth_for(db, email, userId))
            // .flatMapError(error => {
                // console.error('request_login error', {error})
                // return { status: 'error' }
            // })
    }
}