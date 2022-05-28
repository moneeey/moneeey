import { connect } from 'http2';
import PouchDB from 'pouchdb';

export default function connect_pouch(name: string, options: object): PouchDB.Database {
  return new PouchDB(name, options);
}

export type connect_pouch_fn = (name: string, options: object) => PouchDB.Database;
export type pouch_db = PouchDB.Database;
