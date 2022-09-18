/* eslint-disable import/first */
import dotenv from 'dotenv';
dotenv.config({ path: "../sample.env" });

import { pouch_db } from '../core/pouch';
import { ConsoleMock, ConsoleMockType, mockDb, mockDbType, mock_utils } from '../core/test_utils';
import AuthController from './auth_controller';

describe('auth_controller', () => {
  let auth: AuthController;
  let logger: ConsoleMockType;
  let mainDb: mockDbType;
  let smtp_mock: jest.Mock;

  const connectedToMain = {
    connect: [
      "http://couchdb:5984/moneeeey",
      {
        auth: { password: "dev", username: "dev" },
      },
    ],
  };

  beforeEach(() => {
    logger = ConsoleMock();
    mainDb = mockDb();
    smtp_mock = jest.fn();
    auth = new AuthController(
      logger as unknown as Console,
      (name, options) => {
        mainDb.connect(name, options);
        return mainDb as unknown as pouch_db;
      },
      smtp_mock
    );
    mock_utils();
  });

  describe('start', () => {
    it('success new user', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockRejectedValueOnce({ status: 404 }).mockResolvedValueOnce({});
      expect(await auth.start('moneeey@baroni.tech')).toEqual({
        auth_code: 'hashed:-123450004-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003',
        email: 'moneeey@baroni.tech',
        success: true
      });
      expect(mainDb.history).toEqual([
        connectedToMain,
        { get: ['user_hashed:-123450000-moneeey@baroni.tech'] },
        {
          put: [
            {
              _id: 'user_hashed:-123450000-moneeey@baroni.tech',
              auth: [
                {
                  auth_code: 'hashed:-123450004-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003',
                  confirm_code:
                    'hashed:-123450006-hashed:-123450004-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450005',
                  confirmed: false,
                  created: 123450007,
                  updated: 123450008
                }
              ],
              created: 123450002,
              databases: [],
              email: 'moneeey@baroni.tech',
              updated: 123450009
            }
          ]
        }
      ]);
      expect(smtp_mock.mock.calls).toEqual([
        [
          {
            from: 'moneeey@youremail.com',
            html: 'Please click the following link to complete your registration: <a href="http://localhost:4270/?auth_code=hashed:-123450004-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003&confirm_code=hashed:-123450006-hashed:-123450004-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450005&email=moneeey@baroni.tech">http://localhost:4270/?auth_code=hashed:-123450004-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003&confirm_code=hashed:-123450006-hashed:-123450004-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450005&email=moneeey@baroni.tech</a>',
            subject: 'Moneeey login',
            to: 'moneeey@baroni.tech'
          }
        ]
      ]);
      expect(logger.history).toEqual([
        { debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] },
        { debug: ['get_or_create_user created default', { email: 'moneeey@baroni.tech' }] },
        { debug: ['start - saving user with new auth'] },
        { debug: ['start - sending confirmation email'] },
        {
          info: [
            'send_email',
            {
              subject: 'Moneeey login',
              to: 'moneeey@baroni.tech'
            }
          ]
        },
        { debug: ['start - success'] }
      ]);
    });
    it('success existing user', async () => {
      mainDb.spy
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          _id: 'user_hashed:-123450000-moneeey@baroni.tech',
          auth: [
            {
              auth_code: 'other_auth_code',
              confirm_code: 'other_confirm_code',
              confirmed: false,
              created: 123450002,
              updated: 123450003
            }
          ],
          created: 123450001,
          databases: [],
          email: 'moneeey@baroni.tech',
          updated: 123450004
        })
        .mockResolvedValueOnce({});
      expect(await auth.start('moneeey@baroni.tech')).toEqual({
        auth_code: 'hashed:-123450002-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450001',
        email: 'moneeey@baroni.tech',
        success: true
      });
      expect(mainDb.history).toEqual([
        connectedToMain,
        { get: ['user_hashed:-123450000-moneeey@baroni.tech'] },
        {
          put: [
            {
              _id: 'user_hashed:-123450000-moneeey@baroni.tech',
              auth: [
                {
                  auth_code: 'other_auth_code',
                  confirm_code: 'other_confirm_code',
                  confirmed: false,
                  created: 123450002,
                  updated: 123450003
                },
                {
                  auth_code: 'hashed:-123450002-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450001',
                  confirm_code:
                    'hashed:-123450004-hashed:-123450002-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450001moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003',
                  confirmed: false,
                  created: 123450005,
                  updated: 123450006
                }
              ],
              created: 123450001,
              databases: [],
              email: 'moneeey@baroni.tech',
              updated: 123450007
            }
          ]
        }
      ]);
      expect(smtp_mock.mock.calls).toEqual([
        [
          {
            from: 'moneeey@youremail.com',
            html: 'Please click the following link to complete your registration: <a href="http://localhost:4270/?auth_code=hashed:-123450002-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450001&confirm_code=hashed:-123450004-hashed:-123450002-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450001moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003&email=moneeey@baroni.tech">http://localhost:4270/?auth_code=hashed:-123450002-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450001&confirm_code=hashed:-123450004-hashed:-123450002-moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450001moneeey@baroni.tech_auth_UUIDUUID-dcf7-6969-a608-420123450003&email=moneeey@baroni.tech</a>',
            subject: 'Moneeey login',
            to: 'moneeey@baroni.tech'
          }
        ]
      ]);
      expect(logger.history).toEqual([
        { debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] },
        { debug: ['start - saving user with new auth'] },
        { debug: ['start - sending confirmation email'] },
        {
          info: [
            'send_email',
            {
              subject: 'Moneeey login',
              to: 'moneeey@baroni.tech'
            }
          ]
        },
        { debug: ['start - success'] }
      ]);
    });
  });
  describe('check', () => {
    it('success', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({
        _id: 'user_hashed:-123450000-moneeey@baroni.tech',
        auth: [
          {
            auth_code: 'correct_auth_code',
            confirm_code: 'correct_confirm_code',
            confirmed: true,
            created: 123450002,
            updated: 123450003
          }
        ],
        created: 123450001,
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: 123450004
      });
      expect(await auth.check('moneeey@baroni.tech', 'correct_auth_code')).toEqual({
        success: true
      });
      expect(mainDb.history).toEqual([
        connectedToMain,
        {
          get: ['user_hashed:-123450000-moneeey@baroni.tech']
        }
      ]);
      expect(logger.history).toEqual([{ debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] }]);
    });
    it('fails due to invalid auth code', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({
        _id: 'user_hashed:-123450000-moneeey@baroni.tech',
        auth: [
          {
            auth_code: 'correct_auth_code',
            confirm_code: 'correct_confirm_code',
            confirmed: true,
            created: 123450002,
            updated: 123450003
          }
        ],
        created: 123450001,
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: 123450004
      });
      expect(await auth.check('moneeey@baroni.tech', 'incorrect_auth_code')).toEqual({
        success: false
      });
      expect(mainDb.history).toEqual([
        connectedToMain,
        {
          get: ['user_hashed:-123450000-moneeey@baroni.tech']
        }
      ]);
      expect(logger.history).toEqual([{ debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] }]);
    });
    it('fails due to not yet confirmed', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({
        _id: 'user_hashed:-123450000-moneeey@baroni.tech',
        auth: [
          {
            auth_code: 'correct_auth_code',
            confirm_code: 'correct_confirm_code',
            confirmed: false,
            created: 123450002,
            updated: 123450003
          }
        ],
        created: 123450001,
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: 123450004
      });
      expect(await auth.check('moneeey@baroni.tech', 'correct_auth_code')).toEqual({
        success: false
      });
      expect(mainDb.history).toEqual([
        connectedToMain,
        {
          get: ['user_hashed:-123450000-moneeey@baroni.tech']
        }
      ]);
      expect(logger.history).toEqual([{ debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] }]);
    });
    it('fails due to expired', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({
        _id: 'user_hashed:-123450000-moneeey@baroni.tech',
        auth: [
          {
            auth_code: 'correct_auth_code',
            confirm_code: 'correct_confirm_code',
            confirmed: false,
            created: 123450002,
            updated: 100000000
          }
        ],
        created: 123450001,
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: 123450004
      });
      expect(await auth.check('moneeey@baroni.tech', 'correct_auth_code')).toEqual({
        success: false
      });
      expect(mainDb.history).toEqual([
        connectedToMain,
        {
          get: ['user_hashed:-123450000-moneeey@baroni.tech']
        }
      ]);
      expect(logger.history).toEqual([{ debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] }]);
    });
  });
  describe('complete', () => {
    it('success', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({
        _id: 'user_hashed:-123450000-moneeey@baroni.tech',
        auth: [
          {
            auth_code: 'correct_auth_code',
            confirm_code: 'correct_confirm_code',
            confirmed: false,
            created: 123450002,
            updated: 100000000
          }
        ],
        created: 123450001,
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: 123450004
      });
      expect(await auth.complete('moneeey@baroni.tech', 'correct_auth_code', 'correct_confirm_code')).toEqual({
        success: true
      });
      expect(mainDb.history).toEqual([
        connectedToMain,
        { get: ['user_hashed:-123450000-moneeey@baroni.tech'] },
        {
          put: [
            {
              _id: 'user_hashed:-123450000-moneeey@baroni.tech',
              auth: [
                {
                  auth_code: 'correct_auth_code',
                  confirm_code: 'correct_confirm_code',
                  confirmed: true,
                  created: 123450002,
                  updated: 100000000
                }
              ],
              created: 123450001,
              databases: [],
              email: 'moneeey@baroni.tech',
              updated: 123450004
            }
          ]
        }
      ]);
      expect(logger.history).toEqual([{ debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] }]);
    });
    it('fails due to expired auth', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({
        _id: 'user_hashed:-123450000-moneeey@baroni.tech',
        auth: [
          {
            auth_code: 'correct_auth_code',
            confirm_code: 'correct_confirm_code',
            confirmed: false,
            created: 100000000,
            updated: 100000000
          }
        ],
        created: 123450001,
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: 123450004
      });
      expect(await auth.complete('moneeey@baroni.tech', 'correct_auth_code', 'correct_confirm_code')).toEqual({
        success: false,
        error: 'code_expired'
      });
      expect(mainDb.history).toEqual([connectedToMain, { get: ['user_hashed:-123450000-moneeey@baroni.tech'] }]);
      expect(logger.history).toEqual([
        { debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] },
        { error: ['complete - error_code', { email: 'moneeey@baroni.tech', error: 'code_expired' }] }
      ]);
    });
    it('fails due to invalid auth_code', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({
        _id: 'user_hashed:-123450000-moneeey@baroni.tech',
        auth: [
          {
            auth_code: 'correct_auth_code',
            confirm_code: 'correct_confirm_code',
            confirmed: false,
            created: 100000000,
            updated: 100000000
          }
        ],
        created: 123450001,
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: 123450004
      });
      expect(await auth.complete('moneeey@baroni.tech', 'incorrect_auth_code', 'correct_confirm_code')).toEqual({
        success: false,
        error: 'auth_code'
      });
      expect(mainDb.history).toEqual([connectedToMain, { get: ['user_hashed:-123450000-moneeey@baroni.tech'] }]);
      expect(logger.history).toEqual([
        { debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] },
        { error: ['complete - error_code', { email: 'moneeey@baroni.tech', error: 'auth_code' }] }
      ]);
    });
    it('fails due to invalid confirm_code', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({
        _id: 'user_hashed:-123450000-moneeey@baroni.tech',
        auth: [
          {
            auth_code: 'correct_auth_code',
            confirm_code: 'correct_confirm_code',
            confirmed: false,
            created: 100000000,
            updated: 100000000
          }
        ],
        created: 123450001,
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: 123450004
      });
      expect(await auth.complete('moneeey@baroni.tech', 'correct_auth_code', 'incorrect_confirm_code')).toEqual({
        success: false,
        error: 'confirm_code'
      });
      expect(mainDb.history).toEqual([connectedToMain, { get: ['user_hashed:-123450000-moneeey@baroni.tech'] }]);
      expect(logger.history).toEqual([
        { debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] },
        { error: ['complete - error_code', { email: 'moneeey@baroni.tech', error: 'confirm_code' }] }
      ]);
    });
  });
  describe('logout', () => {
    it('success', async () => {
      mainDb.spy.mockResolvedValueOnce({}).mockResolvedValueOnce({
        _id: 'user_hashed:-123450000-moneeey@baroni.tech',
        auth: [
          {
            auth_code: 'correct_auth_code',
            confirm_code: 'correct_confirm_code',
            confirmed: false,
            created: 100000000,
            updated: 100000000
          },
          {
            auth_code: 'unrelated_correct_auth_code',
            confirm_code: 'unrelated_correct_confirm_code',
            confirmed: false,
            created: 100000000,
            updated: 100000000
          }
        ],
        created: 123450001,
        databases: [],
        email: 'moneeey@baroni.tech',
        updated: 123450004
      });
      expect(await auth.logout('moneeey@baroni.tech', 'correct_auth_code')).toEqual({
        success: true
      });
      expect(mainDb.history).toEqual([
        connectedToMain,
        { get: ['user_hashed:-123450000-moneeey@baroni.tech'] },
        {
          put: [
            {
              _id: 'user_hashed:-123450000-moneeey@baroni.tech',
              auth: [
                {
                  auth_code: 'unrelated_correct_auth_code',
                  confirm_code: 'unrelated_correct_confirm_code',
                  confirmed: false,
                  created: 100000000,
                  updated: 100000000
                }
              ],
              created: 123450001,
              databases: [],
              email: 'moneeey@baroni.tech',
              updated: 123450004
            }
          ]
        }
      ]);
      expect(logger.history).toEqual([{ debug: ['get_or_create_user retrieve', { email: 'moneeey@baroni.tech' }] }]);
    });
  });
});
