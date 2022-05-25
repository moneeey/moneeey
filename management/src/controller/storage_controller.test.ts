/* eslint-disable import/first */
import dotenv from 'dotenv';
dotenv.config({ path: './sample.env' })

import { tick, uuid } from '../core';
import { pouch_db } from "../core/pouch"
import { ConsoleMock, ConsoleMockType, mockDb, mockDbType, mock_utils } from "../core/test_utils"
import { IDatabaseLevel } from '../entities';
import StorageController from './storage_controller';

describe('storage_controller', () => {
  let storageController: StorageController
  let logger: ConsoleMockType
  let mainDb: mockDbType
  let smtp_mock: jest.Mock

  beforeEach(() => {
    logger = ConsoleMock()
    mainDb = mockDb()
    smtp_mock = jest.fn()
    storageController = new StorageController(logger as unknown as Console, (name, options) => {
      mainDb.connect(name, options)
      return mainDb as unknown as pouch_db
    }, smtp_mock)
    mock_utils();
  })

  const connectedToMain = {
    "connect": ["https://your-couchdb.com/moneeeey", {
      "auth": { "password": "samplecouchdbpass", "username": "samplecouchdbuser", },
    },],
  }

  describe('create', () => {
    it('success first database', async () => {
      mainDb.spy
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
      expect(await storageController.create({
        _id: 'user-' + uuid(),
        auth: [],
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: tick(),
        created: tick(),
      })).toEqual({ database_id: 'user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003' })
      expect(mainDb.history).toEqual([
        {
          "connect": [
            "https://your-couchdb.com/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
            {
              "auth": {
                "password": "samplecouchdbpass",
                "username": "samplecouchdbuser",
              },
            },
          ],
        },
        {
          "put": [
            {
              "_id": "STORAGE_OWNER",
              "email": "moneeey@baroni.tech",
              "userId": "user-UUIDUUID-dcf7-6969-a608-420123450000",
            },
          ],
        },
        connectedToMain,
        {
          "put": [
            {
              "_id": "user-UUIDUUID-dcf7-6969-a608-420123450000",
              "auth": [],
              "created": 123450002,
              "databases": [
                {
                  "created": 123450004,
                  "database_id": "user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
                  "level": 20,
                  "updated": 123450005,
                },
              ],
              "email": "moneeey@baroni.tech",
              "updated": 123450001,
            },

          ]
        }
      ])
      expect(logger.history).toEqual([
        {
          "debug": [
            "trying to create database",
            "user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
          ],
        },
        {
          "info": [
            "successfuly created storage",
            "user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003",
          ],
        },
      ])
    })

    it('success second database', async () => {
      mainDb.spy
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
      expect(await storageController.create({
        _id: 'user-' + uuid(),
        auth: [],
        databases: [{ created: tick(), database_id: 'existing-db-12345', level: IDatabaseLevel.OWNER, updated: tick() }],
        email: 'moneeey@baroni.tech',
        updated: tick(),
        created: tick(),
      })).toEqual({ database_id: 'user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005' })
      expect(mainDb.history).toEqual([
        {
          "connect": [
            "https://your-couchdb.com/user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005",
            {
              "auth": {
                "password": "samplecouchdbpass",
                "username": "samplecouchdbuser",
              },
            },
          ],
        },
        {
          "put": [
            {
              "_id": "STORAGE_OWNER",
              "email": "moneeey@baroni.tech",
              "userId": "user-UUIDUUID-dcf7-6969-a608-420123450000",
            },
          ],
        },
        connectedToMain,
        {
          "put": [
            {
              "_id": "user-UUIDUUID-dcf7-6969-a608-420123450000",
              "auth": [],
              "created": 123450004,
              "databases": [
                {
                  "created": 123450001,
                  "database_id": "existing-db-12345",
                  "level": 20,
                  "updated": 123450002,
                },
                {
                  "created": 123450006,
                  "database_id": "user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005",
                  "level": 20,
                  "updated": 123450007,
                },

              ],
              "email": "moneeey@baroni.tech",
              "updated": 123450003,
            },

          ]
        }
      ])
      expect(logger.history).toEqual([
        {
          "debug": [
            "trying to create database",
            "user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005",
          ],
        },
        {
          "info": [
            "successfuly created storage",
            "user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450005",
          ],
        },
      ])
    })
  })
})