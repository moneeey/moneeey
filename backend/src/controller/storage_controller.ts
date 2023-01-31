import { connect_pouch_fn, REALMS, smtp_send_fn, tick, uuid } from "../core";
import { IDatabaseLevel, IID, IUser } from "../entities";
import DatabaseController from "./database_controller";

export default class StorageController extends DatabaseController {
  logger: Console;
  smtp_send: smtp_send_fn;

  constructor(
    logger: Console,
    connect_pouch: connect_pouch_fn,
    smtp_send: smtp_send_fn
  ) {
    super(logger, connect_pouch);
    this.logger = logger;
    this.smtp_send = smtp_send;
  }

  async list(user: IUser) {
    return { databases: user.databases };
  }

  async create_database(initialDocument: object) {
    const MAX_TRIES = 3;
    const dbs = [...REALMS];
    for (let i = 0; i < MAX_TRIES; i++) {
      try {
        const {
          host: realm_host,
          username,
          password,
        } = dbs.sort(Math.random)[0];
        const realm_database_id = "user_db_" + uuid().toLowerCase();
        this.logger.debug("storage - trying to create database", {
          realm_host,
          realm_database_id,
        });
        const db = this.connect_db(
          realm_database_id,
          realm_host,
          username,
          password
        );
        await db.put({ _id: "STORAGE_OWNER", ...initialDocument });
        this.logger.info("storage - successfuly created storage", {
          realm_host,
          realm_database_id,
        });
        return { realm_host, realm_database_id };
      } catch (err) {
        this.logger.error("storage - create_database", err);
        return null;
      }
    }
  }

  async create(user: IUser, description: string) {
    const database = await this.create_database({
      email: user.email,
      userId: user._id,
      description,
    });

    if (!database) return { error: "database not created" };

    const mainDb = this.connect_main_db();

    const db = {
      created: tick(),
      updated: tick(),
      description,
      level: IDatabaseLevel.OWNER,
      ...database,
    };
    await mainDb.put({
      ...user,
      databases: [...user.databases, db],
    });

    return db;
  }

  async destroy(user: IUser, database_id: IID) {
    const userDb = user.databases.find(
      (db) => db.realm_database_id === database_id
    );
    const error_code = (error: string) => {
      this.logger.error("destroy - error_code", { user: user._id, error });
      return { success: false, error };
    };
    if (!userDb) return error_code("user_database_not_found");
    const { realm_database_id, realm_host } = userDb;
    const realm = REALMS.find((realm) => realm.host === realm_host);
    if (!realm) return error_code("realm_not_found");
    const { username, password } = realm;
    try {
      this.logger.info("storage - will destroy", {
        realm_database_id,
        realm_host,
        user: user._id,
      });
      const db = this.connect_db(
        realm_database_id,
        realm_host,
        username,
        password
      );
      await db.destroy();

      this.logger.info("storage - destroyed", {
        realm_database_id,
        realm_host,
        user: user._id,
      });
      const mainDb = this.connect_main_db();
      await mainDb.put({
        ...user,
        databases: user.databases.filter(
          (db) => db.realm_database_id !== database_id
        ),
      });
      this.logger.info("storage - user updated after destroying", {
        realm_database_id,
        realm_host,
        user: user._id,
      });
      return { success: true };
    } catch (err) {
      this.logger.error("storage - destroy", {
        realm_database_id,
        realm_host,
        user: user._id,
        err,
      });
      return { success: false };
    }
  }

  async share(
    user: IUser,
    database: IID,
    toEmail: string,
    level: IDatabaseLevel
  ) {
    return { todo: "not implemented" };
  }
}
