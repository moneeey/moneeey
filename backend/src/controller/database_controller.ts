import { connect_pouch_fn, COUCHDB_HOST, COUCHDB_MAIN_DATABASE, COUCHDB_PASSWORD, COUCHDB_USERNAME } from '../core';

export default class DatabaseController {
  connect_pouch: connect_pouch_fn;
  logger: Console;

  constructor(logger: Console, connect_pouch: connect_pouch_fn) {
    this.logger = logger;
    this.connect_pouch = connect_pouch;
  }

  connect_db(
    dbName: string,
    host = COUCHDB_HOST,
    username = COUCHDB_USERNAME,
    password = COUCHDB_PASSWORD
  ) {
    return this.connect_pouch(host + "/" + dbName, {
      auth: {
        username,
        password,
      },
    });
  }

  connect_main_db() {
    return this.connect_db(COUCHDB_MAIN_DATABASE);
  }
}
