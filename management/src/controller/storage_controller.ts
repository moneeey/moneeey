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

  async create_database(prefix: string) {
    const MAX_TRIES = 3
    for(let i = 0; i < MAX_TRIES; i++) {
      try {
        const database_id = prefix + uuid()
        const db = this.connect_db(database_id)
        await db.put({ _id: 'STORAGE_OWNER' })
        return database_id
      } catch (err) {
        this.logger.error('create_database', err)
      }
    }
  }

  async create(user: IUser) {
    const mainDb = this.connect_main_db()

    const database_id = await this.create_database(user._id + '_db_')

    await mainDb.put({...user,
      databases: [...user.databases, {
        created: tick(),
        updated: tick(),
        database_id,
        level: IDatabaseLevel.OWNER
      }]
    })

    return { database_id }
  }

  destroy(user: IUser, database: IID) {
    return { todo: 'not implemented' }
  }

  share(user: IUser, database: IID, toEmail: string, level: IDatabaseLevel) {
    return { todo: 'not implemented' }
  }

  export(user: IUser, database: IID) {
    return { todo: 'not implemented' }
  }

  import(user: IUser, database: IID, content: string) {
    return { todo: 'not implemented' }
  }
}