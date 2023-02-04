/* eslint-disable import/first */
import dotenv from "dotenv";
dotenv.config({ path: "../sample.env" });

import { REALMS, tick, uuid } from "../core";
import { pouch_db } from "../core/pouch";
import {
  ConsoleMock,
  ConsoleMockType,
  mockDb,
  mockDbType,
  mock_utils,
} from "../core/test_utils";
import { IDatabaseLevel } from "../entities";
import StorageController from "./storage_controller";

describe("storage_controller", () => {
  let storageController: StorageController;
  let logger: ConsoleMockType;
  let mainDb: mockDbType;
  let smtp_mock: jest.Mock;

  beforeEach(() => {
    logger = ConsoleMock();
    mainDb = mockDb();
    smtp_mock = jest.fn();
    storageController = new StorageController(
      logger as unknown as Console,
      (name, options) => {
        mainDb.connect(name, options);
        return mainDb as unknown as pouch_db;
      },
      smtp_mock
    );
    mock_utils();
  });

  const connectedToMain = {
    connect: [
      "http://couchdb:5984/moneeeey",
      {
        auth: { password: "dev", username: "dev" },
      },
    ],
  };

  describe("create", () => {
    it("success first database", async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({});
      expect(
        await storageController.create(
          {
            _id: "user-" + uuid(),
            auth: [],
            databases: [],
            email: "moneeey@baroni.tech",
            updated: tick(),
            created: tick(),
          },
          "my first database"
        )
      ).toEqual({
        created: 123450004,
        description: "my first database",
        level: 90,
        realm_database_id: "user_db_uuiduuid-dcf7-6969-a608-420123450003",
        realm_host: "http://couchdb:5984",
        updated: 123450005,
      });
      expect(mainDb.history).toEqual([
        {
          connect: [
            "http://couchdb:5984/user_db_uuiduuid-dcf7-6969-a608-420123450003",
            {
              auth: {
                password: "dev",
                username: "dev",
              },
            },
          ],
        },
        {
          put: [
            {
              _id: "STORAGE_OWNER",
              email: "moneeey@baroni.tech",
              description: "my first database",
              userId: "user-UUIDUUID-dcf7-6969-a608-420123450000",
            },
          ],
        },
        connectedToMain,
        {
          put: [
            {
              _id: "user-UUIDUUID-dcf7-6969-a608-420123450000",
              auth: [],
              created: 123450002,
              databases: [
                {
                  created: 123450004,
                  description: "my first database",
                  realm_database_id:
                    "user_db_uuiduuid-dcf7-6969-a608-420123450003",
                  realm_host: "http://couchdb:5984",
                  level: 90,
                  updated: 123450005,
                },
              ],
              email: "moneeey@baroni.tech",
              updated: 123450001,
            },
          ],
        },
      ]);
      expect(logger.history).toEqual([
        {
          debug: [
            "storage - trying to create database",
            {
              realm_database_id: "user_db_uuiduuid-dcf7-6969-a608-420123450003",
              realm_host: "http://couchdb:5984",
            },
          ],
        },
        {
          info: [
            "storage - successfuly created storage",
            {
              realm_database_id: "user_db_uuiduuid-dcf7-6969-a608-420123450003",
              realm_host: "http://couchdb:5984",
            },
          ],
        },
      ]);
    });

    it("success second database", async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({});
      expect(
        await storageController.create(
          {
            _id: "user-" + uuid(),
            auth: [],
            databases: [
              {
                created: tick(),
                description: "my first database",
                realm_database_id:
                  "user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
                realm_host: "http://localcouchdb.moneeey.io/",
                level: 20,
                updated: tick(),
              },
            ],
            email: "moneeey@baroni.tech",
            updated: tick(),
            created: tick(),
          },
          "my second database"
        )
      ).toEqual({
        created: 123450006,
        description: "my second database",
        level: 90,
        realm_database_id: "user_db_uuiduuid-dcf7-6969-a608-420123450005",
        realm_host: "http://couchdb:5984",
        updated: 123450007,
      });
      expect(mainDb.history).toEqual([
        {
          connect: [
            "http://couchdb:5984/user_db_uuiduuid-dcf7-6969-a608-420123450005",
            {
              auth: {
                password: "dev",
                username: "dev",
              },
            },
          ],
        },
        {
          put: [
            {
              _id: "STORAGE_OWNER",
              description: "my second database",
              email: "moneeey@baroni.tech",
              userId: "user-UUIDUUID-dcf7-6969-a608-420123450000",
            },
          ],
        },
        connectedToMain,
        {
          put: [
            {
              _id: "user-UUIDUUID-dcf7-6969-a608-420123450000",
              auth: [],
              created: 123450004,
              databases: [
                {
                  created: 123450001,
                  realm_database_id:
                    "user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
                  realm_host: "http://localcouchdb.moneeey.io/",
                  description: "my first database",
                  level: 20,
                  updated: 123450002,
                },
                {
                  created: 123450006,
                  description: "my second database",
                  realm_database_id:
                    "user_db_uuiduuid-dcf7-6969-a608-420123450005",
                  realm_host: "http://couchdb:5984",
                  level: 90,
                  updated: 123450007,
                },
              ],
              email: "moneeey@baroni.tech",
              updated: 123450003,
            },
          ],
        },
      ]);
      expect(logger.history).toEqual([
        {
          debug: [
            "storage - trying to create database",
            {
              realm_database_id: "user_db_uuiduuid-dcf7-6969-a608-420123450005",
              realm_host: "http://couchdb:5984",
            },
          ],
        },
        {
          info: [
            "storage - successfuly created storage",
            {
              realm_database_id: "user_db_uuiduuid-dcf7-6969-a608-420123450005",
              realm_host: "http://couchdb:5984",
            },
          ],
        },
      ]);
    });
  });

  describe("destroy", () => {
    it("success", async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({});
      expect(
        await storageController.destroy(
          {
            _id: "user-" + uuid(),
            auth: [],
            databases: [
              {
                created: tick(),
                realm_database_id: "existing-db-12345",
                realm_host: "http://couchdb:5984",
                level: IDatabaseLevel.OWNER,
                updated: tick(),
                description: "hello",
              },
              {
                created: tick(),
                realm_database_id: "another-db-54321",
                realm_host: "http://couchdb:5984",
                level: IDatabaseLevel.USER,
                updated: tick(),
                description: "world",
              },
            ],
            email: "moneeey@baroni.tech",
            updated: tick(),
            created: tick(),
          },
          "existing-db-12345"
        )
      ).toEqual({ success: true });
      expect(mainDb.history).toEqual([
        {
          connect: [
            "http://couchdb:5984/existing-db-12345",
            {
              auth: {
                password: "dev",
                username: "dev",
              },
            },
          ],
        },
        {
          destroy: [],
        },
        connectedToMain,
        {
          put: [
            {
              _id: "user-UUIDUUID-dcf7-6969-a608-420123450000",
              auth: [],
              created: 123450006,
              databases: [
                {
                  created: 123450003,
                  description: "world",
                  realm_database_id: "another-db-54321",
                  realm_host: "http://couchdb:5984",
                  level: 50,
                  updated: 123450004,
                },
              ],
              email: "moneeey@baroni.tech",
              updated: 123450005,
            },
          ],
        },
      ]);
      expect(logger.history).toEqual([
        {
          info: [
            "storage - will destroy",
            {
              realm_database_id: "existing-db-12345",
              realm_host: "http://couchdb:5984",
              user: "user-UUIDUUID-dcf7-6969-a608-420123450000",
            },
          ],
        },
        {
          info: [
            "storage - destroyed",
            {
              realm_database_id: "existing-db-12345",
              realm_host: "http://couchdb:5984",
              user: "user-UUIDUUID-dcf7-6969-a608-420123450000",
            },
          ],
        },
        {
          info: [
            "storage - user updated after destroying",
            {
              realm_database_id: "existing-db-12345",
              realm_host: "http://couchdb:5984",
              user: "user-UUIDUUID-dcf7-6969-a608-420123450000",
            },
          ],
        },
      ]);
    });

    it("bad database id", async () => {
      expect(
        await storageController.destroy(
          {
            _id: "user-" + uuid(),
            auth: [],
            databases: [
              {
                created: tick(),
                realm_database_id: "existing-db-12345",
                realm_host: "http://couchdb:5984",
                level: IDatabaseLevel.OWNER,
                updated: tick(),
                description: "hello",
              },
              {
                created: tick(),
                realm_database_id: "another-db-54321",
                realm_host: "http://couchdb:5984",
                level: IDatabaseLevel.USER,
                updated: tick(),
                description: "world",
              },
            ],
            email: "moneeey@baroni.tech",
            updated: tick(),
            created: tick(),
          },
          "not-my-db-98841"
        )
      ).toEqual({
        error: "user_database_not_found",
        success: false,
      });
      expect(mainDb.history).toEqual([]);
      expect(logger.history).toEqual([
        {
          error: [
            "destroy - error_code",
            {
              user: "user-UUIDUUID-dcf7-6969-a608-420123450000",
              error: "user_database_not_found",
            },
          ],
        },
      ]);
    });

    it("bad realm host", async () => {
      expect(
        await storageController.destroy(
          {
            _id: "user-" + uuid(),
            auth: [],
            databases: [
              {
                created: tick(),
                realm_database_id: "existing-db-12345",
                realm_host: "unknown_realm_host",
                level: IDatabaseLevel.OWNER,
                updated: tick(),
                description: "hello",
              },
            ],
            email: "moneeey@baroni.tech",
            updated: tick(),
            created: tick(),
          },
          "existing-db-12345"
        )
      ).toEqual({
        error: "realm_not_found",
        success: false,
      });
      expect(mainDb.history).toEqual([]);
      expect(logger.history).toEqual([
        {
          error: [
            "destroy - error_code",
            {
              user: "user-UUIDUUID-dcf7-6969-a608-420123450000",
              error: "realm_not_found",
            },
          ],
        },
      ]);
    });
  });

  describe("realms", () => {
    it("load all", () => {
      expect(REALMS).toEqual([
        {
          host: "http://couchdb:5984",
          username: "dev",
          password: "dev",
        },
        {
          host: "http://couchdb:5984",
          username: "dev",
          password: "dev",
        },
      ]);
    });
  });
});
