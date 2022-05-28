import { connect_pouch_fn, COUCHDB_HOST, COUCHDB_MAIN_DATABASE, COUCHDB_PASSWORD, COUCHDB_USERNAME } from '../core';

export default class DatabaseController {
  connect_pouch: connect_pouch_fn;
  logger: Console;

  constructor(logger: Console, connect_pouch: connect_pouch_fn) {
    this.logger = logger;
    this.connect_pouch = connect_pouch;
  }

  connect_db(dbName: string) {
    return this.connect_pouch(COUCHDB_HOST + '/' + dbName, {
      auth: {
        username: COUCHDB_USERNAME,
        password: COUCHDB_PASSWORD
      }
    });
  }

  connect_main_db() {
    return this.connect_db(COUCHDB_MAIN_DATABASE);
  }
}
