import { Request, Response } from "express";
import { request, RequestOptions } from "http";
import { prependListener } from "process";
import { b64encode, connect_pouch_fn, REALMS } from "../core";
import { IUser } from "../entities";
import DatabaseController from "./database_controller";

export default class DbProxyController extends DatabaseController {
  logger: Console;

  constructor(logger: Console, connect_pouch: connect_pouch_fn) {
    super(logger, connect_pouch);
    this.logger = logger;
  }

  async proxy(
    user: IUser,
    realm_database_id: string,
    req: Request,
    res: Response
  ) {
    const db = user.databases.find(
      (db) => db.realm_database_id === realm_database_id
    );
    if (db) {
      const realmDb = REALMS.find((realm) => realm.host === db.realm_host);
      if (!realmDb) {
        return { status: 404, error: "RealmDB not found" };
      }
      const { host: realmHost, username, password } = realmDb;
      const { protocol, port, hostname: host } = new URL(realmHost);
      const { body } = req;
      const forwardConfig: RequestOptions = {
        protocol,
        host,
        port,
        path: req.path,
        method: req.method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Basic ${b64encode(username + ":" + password)}`,
        },
      };
      const forwarded = request(forwardConfig, (pres) => {
        pres.setEncoding("utf-8");
        res.status(pres.statusCode || 200);
        pres.pipe(res);
      });
      // req.pipe(forwarded);
      forwarded.write(JSON.stringify(body));
      forwarded.end();
    } else {
      return { status: 404, error: "Database not found" };
    }
  }
}
