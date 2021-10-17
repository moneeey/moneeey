import dotenv from "dotenv";
import { addSyntheticLeadingComment } from "typescript";
import Management from "./management";

dotenv.config({ path: './sample.env' })

const DEFAULT_DB_NAME = 'moneeeey'

function PouchDBMock() {
  let connectedDBs: { [_dbName: string]: object } = {}
  let expectedDBs: string[] = []

  const makeDb = (dbName: string) => ({
    dbName,
    get: jest.fn(),
    put: jest.fn(),
    remove: jest.fn(),
    close: jest.fn(),
  })
  type mockDbType = ReturnType<typeof makeDb>

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
    expect(pouchDbMock.dbNames().sort()).toEqual(pouchDbMock.expectedDBNames())
  })

  it('hash email', () => {
    expect(process.env.EMAIL_HASH_PREFIX).toEqual('somethingveryrandom')
    expect(process.env.EMAIL_ROUNDS).toEqual('64')
    expect(management.hash_email('fernando@baroni.tech')).toEqual('27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93')
  })

  function expectConnectDefaultDB() {
    pouchDbMock.expectDBs([DEFAULT_DB_NAME])
  }

  describe('request_login', () => {
    const email = 'fernando@baroni.tech'
    const authDoc = {
      "_id": "authorize_27f7d3a27ae0edac45d8f2da79e5a60323ce36b773dda33acf7d89d6de483d0a8d5358df4a3e8e91520efd4fe0aa3b7d37a6cbd0cba90a59894cff2e227cfc93",
      "code": "07a10d43a423002df2b7e8907254e45273794aa02a128f6714772e5540f63ae8",
      "epooch": 1634439600011,
    }
    const sendEmail = ['send_email', {
      "content": "Please click the following link to complete your login frontend.moneeey.local:3000/auth/?code=07a10d43a423002df2b7e8907254e45273794aa02a128f6714772e5540f63ae8&email=fernando@baroni.tech",
      "subject": "Moneeey login",
      "to": "fernando@baroni.tech",
    }];

    it('success with no existing authDoc', async () => {
      expectConnectDefaultDB()

      const db = management.connect_default_db()
      const mockDb = pouchDbMock.mockedDbToMock(db)

      mockDb.get.mockRejectedValueOnce({ status: 404 })
        .mockResolvedValueOnce(authDoc)
      mockDb.put.mockResolvedValueOnce(authDoc)

      await management.request_login(db, email).take(1).toPromise()

      expect(mockDb.put.mock.calls).toEqual([[authDoc]])
      expect(mockDb.remove.mock.calls).toEqual([])
      expect(consoleMock.history).toEqual([{ log: sendEmail }])
    })

    it('success by replacing existing authDoc', async () => {
      expectConnectDefaultDB()

      const db = management.connect_default_db()
      const mockDb = pouchDbMock.mockedDbToMock(db)
      const existingAuthDoc = {
        _id: 'existingAuthDocId',
        code: 'badCode',
        epooch: 123456,
      }

      mockDb.get.mockResolvedValueOnce(existingAuthDoc)
        .mockResolvedValueOnce(authDoc)
      mockDb.put.mockResolvedValueOnce(authDoc)
      mockDb.remove.mockResolvedValueOnce({ ok: true })

      await management.request_login(db, email).take(1).toPromise()

      expect(mockDb.put.mock.calls).toEqual([[authDoc]])
      expect(mockDb.remove.mock.calls).toEqual([[existingAuthDoc]])
      expect(consoleMock.history).toEqual([{ log: sendEmail }])
    })

    it('error creating authDoc', async () => {
      expectConnectDefaultDB()

      const db = management.connect_default_db()
      const mockDb = pouchDbMock.mockedDbToMock(db)

      mockDb.get.mockRejectedValueOnce({ status: 404 })
        .mockResolvedValueOnce(authDoc)
      mockDb.put.mockRejectedValueOnce({ status: 'ops' })

      try {
        await management.request_login(db, email).take(1).toPromise()
      } catch {}

      expect(mockDb.put.mock.calls).toEqual([[authDoc]])
      expect(mockDb.remove.mock.calls).toEqual([])
      expect(consoleMock.history).toEqual([{ error: ['request_login', { error: { status: 'ops'}}] }])
    })

    it('error sending email', async () => {
      expectConnectDefaultDB()

      const db = management.connect_default_db()
      const mockDb = pouchDbMock.mockedDbToMock(db)

      mockDb.get.mockRejectedValueOnce({ status: 404 })
        .mockResolvedValueOnce(authDoc)
      mockDb.put.mockResolvedValueOnce(authDoc)

      jest.spyOn(management, 'send_email').mockRejectedValueOnce({ no: 'email-4-u' })

      try {
        await management.request_login(db, email).take(1).toPromise()
      } catch {}

      expect(mockDb.put.mock.calls).toEqual([[authDoc]])
      expect(mockDb.remove.mock.calls).toEqual([])
      expect(consoleMock.history).toEqual([{ error: ['request_login', { error: { no: 'email-4-u'}}] }])
    })
  })
});