/* eslint-disable import/first */
import dotenv from 'dotenv';
import { tick, uuid } from '../core';
dotenv.config({ path: './sample.env' })

import { pouch_db } from "../core/pouch"
import { ConsoleMock, ConsoleMockType, mockDb, mockDbType, mock_utils } from "../core/test_utils"
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

  describe('create', () => {
    it('success', async () => {
      expect(await storageController.create({
        _id: 'user-'+uuid(),
        auth: [],
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: tick(),
        created: tick(),
      })).toEqual({ database_id: 'user-UUIDUUID-dcf7-6969-a608-420123450000_db_UUIDUUID-dcf7-6969-a608-420123450003' })
    })
  })
})