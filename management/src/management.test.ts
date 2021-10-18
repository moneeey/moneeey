import dotenv from "dotenv";
import { isObject } from "lodash";
import { addSyntheticLeadingComment } from "typescript";
import Management from "./management";

dotenv.config({ path: './sample.env' })

const DEFAULT_DB_NAME = 'moneeeey'

const makeDb = (dbName: string) => ({
  dbName,
  get: jest.fn(),
  put: jest.fn(),
  remove: jest.fn(),
  close: jest.fn(),
})
type mockDbType = ReturnType<typeof makeDb>

function PouchDBMock() {
  let connectedDBs: { [_dbName: string]: object } = {}
  let expectedDBs: string[] = []


  return {
    connect<T>(dbName: string): PouchDB.Database<T> {
      if (!connectedDBs[dbName]) { connectedDBs[dbName] = makeDb(dbName) }
      return connectedDBs[dbName] as unknown as PouchDB.Database<T>
    },
    mockedDbToMock<T>(database: PouchDB.Database<T>) {
      return database as unknown as mockDbType
    },
    dbNames() {
      return Object.keys(connectedDBs)
    },
    expectedDBNames() {
      return expectedDBs
    },
    expectDBs(dbNames: string[]) {
      expectedDBs = dbNames
    },
  }
}

function ConsoleMock() {
  const history = [] as any[]
  const addLog = (level: string) => (...args: any[]) => history.push({ [level]: args })
  return {
    log: addLog('log'),
    debug: addLog('debug'),
    info: addLog('info'),
    warn: addLog('warn'),
    error: addLog('error'),
    history,
  }
}

describe('management server', () => {
  let consoleMock = ConsoleMock()
  let pouchDbMock = PouchDBMock()
  let management = new Management(consoleMock)
  let currentTick = 0

  beforeEach(() => {
    consoleMock = ConsoleMock()
    pouchDbMock = PouchDBMock()
    management = new Management(consoleMock)
    currentTick = new Date(2021, 9, 17).getTime()
    jest.spyOn(management, 'connect').mockImplementation(pouchDbMock.connect)
    jest.spyOn(management, 'tick').mockImplementation(() => ++currentTick)
    jest.spyOn(Math, 'random').mockImplementation(() => 0.420)
  })

  afterEach(() => {
    expect(pouchDbMock.dbNames().sort()).toEqual(pouchDbMock.expectedDBNames().sort())
  })

  it('hash email', () => {
    expect(process.env.EMAIL_HASH_PREFIX).toEqual('somethingveryrandom')
    expect(process.env.EMAIL_ROUNDS).toEqual('64')
    expect(management.hash_email('fernando@baroni.tech')).toEqual('27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93')
  })

  function expectConnectDefaultDB() {
    pouchDbMock.expectDBs([DEFAULT_DB_NAME])
  }

  function expectConnectDefaultAndUsersDB() {
    pouchDbMock.expectDBs([DEFAULT_DB_NAME, '_users'])
  }

  function expectDbState(db: mockDbType, expectedState: any) {
      const state = {
        get: db.get.mock.calls,
        put: db.put.mock.calls,
        remove: db.remove.mock.calls,
        close: db.close.mock.calls,
      }
      expect(state).toEqual(expectedState)
  }

  const email = 'fernando@baroni.tech'
  const authDoc = {
    "_id": "authorize_27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93",
    "created": 1634439600011,
    "authCode": "1a0cb038c2a1474f2b92301b1f1fb794",
    "loginCode": "e95f005af7a8275a59f17cd9a3171a93",
  }
  const existingAuthDoc = {
    _id: 'existingAuthDocId',
    code: 'oldCode',
    epooch: 123456,
  }
  const userDoc = {
    "_id": "user_27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93",
    "database": {
      "name": "a",
      "user": "b",
      "pass": "c",
    },
    "created": 1634439600011,
  }
  const sendEmail = ['send_email', {
    "content": "Please click the following link to complete your login frontend.moneeey.local:3000/auth/?code=1a0cb038c2a1474f2b92301b1f1fb794&email=fernando@baroni.tech",
    "subject": "Moneeey login",
    "to": "fernando@baroni.tech",
  }];

  describe('request_login', () => {
    let db: PouchDB.Database
    let mockDb: mockDbType

    beforeEach(() => {
      expectConnectDefaultDB()

      db = management.connect_default_db()
      mockDb = pouchDbMock.mockedDbToMock(db)
    })

    it('success with no existing authDoc', async () => {
      mockDb.get.mockRejectedValueOnce({ status: 404 })
        .mockResolvedValueOnce(authDoc)
      mockDb.put.mockResolvedValueOnce(authDoc)

      expect(await management.request_login(db, email).take(1).toPromise())
        .toEqual({login: "e95f005af7a8275a59f17cd9a3171a93", status: "ok"})

      expectDbState(mockDb, {
        get: [
          ['authorize_27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93'],
          ['authorize_27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93'],
        ],
        put: [ [authDoc], ],
        remove: [],
        close: [],
      })
      expect(consoleMock.history).toEqual([{ log: sendEmail }])
    })

    it('success by replacing existing authDoc', async () => {
      mockDb.get.mockResolvedValueOnce(existingAuthDoc)
        .mockResolvedValueOnce(authDoc)
      mockDb.put.mockResolvedValueOnce(authDoc)
      mockDb.remove.mockResolvedValueOnce({ ok: true })

      expect(await management.request_login(db, email).take(1).toPromise())
        .toEqual({login: "e95f005af7a8275a59f17cd9a3171a93", status: "ok"})

      expectDbState(mockDb, {
        get: [
          ['authorize_27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93'],
          ['authorize_27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93'],
        ],
        put: [ [authDoc], ],
        remove: [ [ existingAuthDoc ] ],
        close: [],
      })
      expect(consoleMock.history).toEqual([{ log: sendEmail }])
    })

    it('error creating authDoc', async () => {
      mockDb.get.mockRejectedValueOnce({ status: 404 })
        .mockResolvedValueOnce(authDoc)
      mockDb.put.mockRejectedValueOnce({ status: 'ops' })

      expect(await management.request_login(db, email).take(1).toPromise())
        .toEqual({ status: 'error' })

      expectDbState(mockDb, {
        get: [
          ['authorize_27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93'],
        ],
        put: [ [authDoc], ],
        remove: [],
        close: [],
      })
      expect(consoleMock.history).toEqual([{ error: ['request_login', { error: { status: 'ops'}}] }])
    })

    it('error sending email', async () => {
      mockDb.get.mockRejectedValueOnce({ status: 404 })
        .mockResolvedValueOnce(authDoc)
      mockDb.put.mockResolvedValueOnce(authDoc)

      jest.spyOn(management, 'send_email').mockRejectedValueOnce({ no: 'email-4-u' })

      expect(await management.request_login(db, email).take(1).toPromise())
        .toEqual({ status: 'error' })

      expect(mockDb.put.mock.calls).toEqual([[authDoc]])
      expect(mockDb.remove.mock.calls).toEqual([])
      expect(consoleMock.history).toEqual([{ error: ['request_login', { error: { no: 'email-4-u'}}] }])
    })
  })

  describe('complete_login', () => {
    let db: PouchDB.Database
    let mockDb: mockDbType

    beforeEach(() => {
      expectConnectDefaultDB()

      db = management.connect_default_db()
      mockDb = pouchDbMock.mockedDbToMock(db)
    })

    it('success existing user', async () => {
      mockDb.get.mockResolvedValueOnce(authDoc)
        .mockResolvedValueOnce(userDoc)
      mockDb.put.mockResolvedValueOnce(authDoc)
      mockDb.remove.mockResolvedValueOnce({ ok: true })

      expect(await management.complete_login(db, email, '1a0cb038c2a1474f2b92301b1f1fb794').take(1).toPromise())
        .toEqual({
            "status": "ok",
            "user": {
              "_id": "user_27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93",
              "created": 1634439600011,
              "database": {
                "name": "a",
                "pass": "c",
                "user": "b",
              },
            },
        })

      expect(mockDb.put.mock.calls).toEqual([])
      expect(mockDb.remove.mock.calls).toEqual([[authDoc]])
      expect(consoleMock.history).toEqual([])
    })

    it('success non-existing user, create DB', async () => {
      expectConnectDefaultAndUsersDB()
      const userDoc = {
        _id: 'user_'
      }
      mockDb.get.mockResolvedValueOnce(authDoc)
        .mockRejectedValueOnce({ status: 404 })
      mockDb.put.mockResolvedValueOnce(authDoc)
      mockDb.remove.mockResolvedValueOnce({ ok: true })

      await management.complete_login(db, email, '1a0cb038c2a1474f2b92301b1f1fb794').take(1).toPromise()

      expect(mockDb.put.mock.calls).toEqual([])
      expect(mockDb.remove.mock.calls).toEqual([[authDoc]])
      expect(consoleMock.history).toEqual([])
    })

    it('error retrieving authDoc', async () => {})
    it('wrong code', async () => {})
    it('timeout', async () => {})
    it('error removing authDoc', async () => {})
    it('non 404 error retrieving user', async () => {})
  })
});