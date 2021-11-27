import dotenv from "dotenv";
import Management, {AUTH_MAX_TIME} from "./management";

dotenv.config({ path: './sample.env' })

const DEFAULT_DB_NAME = 'moneeeey'

const makeDb = (dbName: string) => {
  const history = [] as any[]
  const spy = jest.fn()
  const addHistorySpy = (level: string) => (...args: any[]) => {
    history.push({ [level]: args })
    return spy(...args)
  }
  return {
    dbName,
    get: addHistorySpy('get'),
    put: addHistorySpy('put'),
    remove: addHistorySpy('remove'),
    close: addHistorySpy('close'),
    history,
    spy,
  }
}
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

const AUTH_1 = {
  "code": "0022008b603cbc4e203203a00e32e3ba",
  "confirm_code": "6bd1ac10c31b02de0a5e9c28528be720",
  "created": 1634439600006
};

const AUTH_2 = {
  "code": "f08e423c80f4f94abafcd941abb98f90",
  "confirm_code": "8313f4aa0ae393dbe9b005b4841a12b4",
  "created": 1634439600004
};

describe('management server', () => {
  const email = 'fernando@baroni.tech'
  const emailHash = 'fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0'
  let consoleMock = ConsoleMock()
  let pouchDbMock = PouchDBMock()
  let management = new Management(consoleMock)
  let currentTick = 0
  let db: PouchDB.Database
  let dbMock: mockDbType

  beforeEach(() => {
    consoleMock = ConsoleMock()
    pouchDbMock = PouchDBMock()
    pouchDbMock.expectDBs([DEFAULT_DB_NAME])
    management = new Management(consoleMock)
    currentTick = new Date(2021, 9, 17).getTime()
    jest.spyOn(management, 'connect_db').mockImplementation(pouchDbMock.connect)
    jest.spyOn(management, 'tick').mockImplementation(() => ++currentTick)
    jest.spyOn(Math, 'random').mockImplementation(() => 0.420)
    db = management.connect_default_db()
    dbMock = pouchDbMock.mockedDbToMock(db)
  })

  afterEach(() => {
    expect(pouchDbMock.dbNames().sort()).toEqual(pouchDbMock.expectedDBNames().sort())
  })

  describe('hash', () => {
    it('hash email', () => {
      expect(process.env.EMAIL_HASH_PREFIX).toEqual('somethingveryrandom')
      expect(management.hash_email(email)).toEqual(emailHash)
    })
  })

  function sendEmailLog(confirmCode: string = "") {
    return [
      "send_email",
      {
        "content": "Please click the following link to complete your login http://frontend.moneeey.local:3000/auth/?code=" + confirmCode + "&email=fernando@baroni.tech",
        "subject": "Moneeey login",
        "to": "fernando@baroni.tech"
      }
    ];
  }

  describe('auth_start', () => {

    it('success - creates new user', async () => {
      dbMock.spy
          .mockRejectedValueOnce({ status: 404 })
          .mockImplementationOnce(userDoc => Promise.resolve(({...userDoc, _rev: 'created' })))
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})

      expect(await management.auth_start(email).toPromise())
          .toEqual({login: "0022008b603cbc4e203203a00e32e3ba", status: "started"})

      expect(dbMock.history).toEqual([
        {
          "get": [
            "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0"
          ]
        },
        {
          "put": [
            {
              "_id": "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0",
              "auth": [],
              "created": 1634439600001,
              "databases": [],
              "email": "fernando@baroni.tech",
              "sessions": [],
              "updated": 1634439600002
            }
          ]
        },
        {
          "put": [
            {
              "_id": "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0",
              "_rev": "created",
              "auth": [ AUTH_1 ],
              "created": 1634439600001,
              "databases": [],
              "email": "fernando@baroni.tech",
              "sessions": [],
              "updated": 1634439600003
            }
          ]
        }
      ])
      expect(consoleMock.history).toEqual([
        { log: sendEmailLog("6bd1ac10c31b02de0a5e9c28528be720") },
      ])
    })

    it('success - existing user', async () => {
      dbMock.spy
          .mockResolvedValueOnce( {
            "_id": "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0",
            "_rev": "created",
            "auth": [ AUTH_1 ],
            "created": 1634439600001,
            "databases": [],
            "email": "fernando@baroni.tech",
            "sessions": [],
            "updated": 1634439600003
          })
          .mockImplementationOnce(userDoc => Promise.resolve(({...userDoc, _rev: 'created' })))
          .mockResolvedValueOnce({ _rev: 'updated' })
          .mockResolvedValueOnce({})

      expect(await management.auth_start(email).toPromise())
          .toEqual({login: "f08e423c80f4f94abafcd941abb98f90", status: "started"})

      expect(dbMock.history).toEqual([
        {
          "get": [
            "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0"
          ]
        },
        {
          "put": [
            {
              "_id": "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0",
              "_rev": "created",
              "auth": [ AUTH_2, AUTH_1 ],
              "created": 1634439600001,
              "databases": [],
              "email": "fernando@baroni.tech",
              "sessions": [],
              "updated": 1634439600001
            }
          ]
        }
      ])
      expect(consoleMock.history).toEqual([
          { log: sendEmailLog("8313f4aa0ae393dbe9b005b4841a12b4") },
      ])
    })

  })

  describe('auth_complete', () => {

    it('success - creates new session', async () => {
        dbMock.spy
            .mockResolvedValueOnce( {
              "_id": "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0",
              "_rev": "created",
              "auth": [ AUTH_1, AUTH_2 ],
              "created": 1634439600001,
              "databases": [],
              "email": "fernando@baroni.tech",
              "sessions": [],
              "updated": 1634439600003
            })
            .mockImplementationOnce(userDoc => Promise.resolve(({...userDoc, _rev: 'updated' })))

        expect(await management.auth_complete(email, AUTH_1.confirm_code).toPromise())
            .toEqual({status: "confirmed"})

        expect(dbMock.history).toEqual([
          {
            "get": [
              "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0"
            ]
          },
          {
            "put": [
              {
                "_id": "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0",
                "_rev": "created",
                "auth": [ AUTH_2 ],
                "created": 1634439600001,
                "databases": [],
                "email": "fernando@baroni.tech",
                "sessions": [{
                  "code": AUTH_1.code,
                  "created": 1634439600004,
                }],
                "updated": 1634439600002
              }
            ]
          }
        ])
        expect(consoleMock.history).toEqual([])
    })

    it('confirmation_code not found', async () => {
      dbMock.spy
          .mockResolvedValueOnce( {
            "_id": "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0",
            "_rev": "created",
            "auth": [ AUTH_1, AUTH_2 ],
            "created": 1634439600001,
            "databases": [],
            "email": "fernando@baroni.tech",
            "sessions": [],
            "updated": 1634439600003
          })

      expect(await management.auth_complete(email, 'idontexist').toPromise())
          .toEqual({status: "error"})

      expect(dbMock.history).toEqual([
        {
          "get": [
            "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0"
          ]
        },
      ])
      expect(consoleMock.history).toEqual([{
        error: [
            'auth_complete', { error: 'confirmation_code_not_found' }
        ]
      }])
    })

    it('expired', async () => {
      dbMock.spy
          .mockResolvedValueOnce( {
            "_id": "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0",
            "_rev": "created",
            "auth": [ AUTH_1 ],
            "created": 1634439600001,
            "databases": [],
            "email": "fernando@baroni.tech",
            "sessions": [],
            "updated": 1634439600003
          })

      currentTick += AUTH_MAX_TIME + 10

      expect(await management.auth_complete(email, AUTH_1.confirm_code).toPromise())
          .toEqual({status: "error"})

      expect(dbMock.history).toEqual([
        {
          "get": [
            "user_fe505a016c5edc723fc838853c0dd47379f6712e6d72ba9bb655dac4f9c6832254f95f8d93f38fc85e9522619fb2f2c0968d19406c8bcedc32fe8dfcfadd7ce0"
          ]
        },
      ])
      expect(consoleMock.history).toEqual([{
        error: [
          'auth_complete', { error: 'confirmation_code_expired' }
        ]
      }])
    })
  })
});
