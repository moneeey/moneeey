import { connect_pouch_fn, smtp_send_fn, tick, uuid } from '../core';
import { IDatabaseLevel, IID, IUser } from '../entities';
import DatabaseController from './database_controller';

export default class StorageController extends DatabaseController {
  logger: Console
  smtp_send: smtp_send_fn

  constructor(logger: Console, connect_pouch: connect_pouch_fn, smtp_send: smtp_send_fn) {
    super(logger, connect_pouch)
    this.logger = logger
    this.smtp_send = smtp_send
  }

  async list(user: IUser) {
    return { databases: user.databases }
  }

  async create_database(prefix: string, initialDocument: object) {
    const MAX_TRIES = 3
    for (let i = 0; i < MAX_TRIES; i++) {
      try {
        const database = prefix + uuid()
        this.logger.debug('storage - trying to create database', { database })
        const db = this.connect_db(database)
        await db.put({ _id: 'STORAGE_OWNER', ...initialDocument })
        this.logger.info('storage - successfuly created storage', { database })
        return database
      } catch (err) {
        this.logger.error('storage - create_database', err)
      }
    }
  }

  async create(user: IUser, description: string) {
    const database_id = await this.create_database(user._id + '_db_', { email: user.email, userId: user._id, description })

    const mainDb = this.connect_main_db()
    await mainDb.put({
      ...user,
      databases: [...user.databases, {
        created: tick(),
        updated: tick(),
        description,
        database_id,
        level: IDatabaseLevel.OWNER
      }]
    })

    return { database_id }
  }

  async destroy(user: IUser, database: IID) {
    const userDb = user.databases.find(db => db.database_id === database)
    const error_code = (error: string) => {
      this.logger.error('destroy - error_code', { email: user.email, error })
      return { success: false, error }
    }
    if (!userDb) return error_code('user_database_not_found')
    try {
      this.logger.info('storage - will destroy', { database, user: user.email })
      const db = this.connect_db(database)
      await db.destroy()

      this.logger.info('storage - destroyed', { database, user: user.email })
      const mainDb = this.connect_main_db()
      await mainDb.put({
        ...user,
        databases: user.databases.filter(db => db.database_id !== database)
      })
      this.logger.info('storage - user updated after destroying', { database, user: user.email })
      return { success: true }
    } catch (err) {
      this.logger.error('storage - destroy', { database, user: user.email, err})
      return { success: false }
    }
  }

  async share(user: IUser, database: IID, toEmail: string, level: IDatabaseLevel) {
    return { todo: 'not implemented' }
  }

  async export(user: IUser, database: IID) {
    return { todo: 'not implemented' }
  }

  async import(user: IUser, database: IID, content: string) {
    return { todo: 'not implemented' }
  }
}