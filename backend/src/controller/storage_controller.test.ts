/* eslint-disable import/first */
import dotenv from 'dotenv';
dotenv.config({ path: "../sample.env" });

import { tick, uuid } from "../core";
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
        database_url:
          "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
      });
      expect(mainDb.history).toEqual([
        {
          connect: [
            "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
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
                  database_url:
                    "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
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
              database_url:
                "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
            },
          ],
        },
        {
          info: [
            "storage - successfuly created storage",
            {
              database_url:
                "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
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
                database_url:
                  "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
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
        database_url:
          "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005",
      });
      expect(mainDb.history).toEqual([
        {
          connect: [
            "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005",
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
                  database_url:
                    "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
                  description: "my first database",
                  level: 20,
                  updated: 123450002,
                },
                {
                  created: 123450006,
                  database_url:
                    "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005",
                  description: "my second database",
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
              database_url:
                "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005",
            },
          ],
        },
        {
          info: [
            "storage - successfuly created storage",
            {
              database_url:
                "http://localcouchdb.moneeey.io/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005",
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
                database_url: "existing-db-12345",
                level: IDatabaseLevel.OWNER,
                updated: tick(),
                description: "hello",
              },
              {
                created: tick(),
                database_url: "another-db-54321",
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
                  database_url: "another-db-54321",
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
              database: "existing-db-12345",
              user: "moneeey@baroni.tech",
            },
          ],
        },
        {
          info: [
            "storage - destroyed",
            {
              database: "existing-db-12345",
              user: "moneeey@baroni.tech",
            },
          ],
        },
        {
          info: [
            "storage - user updated after destroying",
            {
              database: "existing-db-12345",
              user: "moneeey@baroni.tech",
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
                database_url: "existing-db-12345",
                level: IDatabaseLevel.OWNER,
                updated: tick(),
                description: "hello",
              },
              {
                created: tick(),
                database_url: "another-db-54321",
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
              email: "moneeey@baroni.tech",
              error: "user_database_not_found",
            },
          ],
        },
      ]);
    });
  });

  describe("realms", () => {
    it("load all", () => {
      expect(storageController.realms()).toEqual([
        {
          host: "http://localcouchdb.moneeey.io",
          username: "dev",
          password: "dev",
        },
        {
          host: "http://localcouchdb.moneeey.io",
          username: "dev",
          password: "dev",
        },
      ]);
    });
  });
});
