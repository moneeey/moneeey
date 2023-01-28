import { ICurrency } from '../entities/Currency';

import { EntityType } from './Entity';
import { MockLogger } from './Logger';
import MappedStore from './MappedStore';
import PersistenceStore from './Persistence';

describe('Persistence', () => {
  let persistence: PersistenceStore;
  let mockStore: MappedStore<ICurrency>;
  let mockLogger: MockLogger;

  const yesterday = {
    updated: '2022-10-13T22:00:26-03:00',
    created: '2022-10-13T22:00:26-03:00',
  };

  const today = {
    updated: '2022-10-14T23:00:26-03:00',
    created: '2022-10-14T23:00:26-03:00',
  };

  const rev1 = { _rev: '1-13cc7a98be34fcf6a409b9808b592025' };
  const rev2 = { _rev: '2-13cc7a98be34fcf6a409b9808b592030' };

  const sampleCurrency = (obj: object) => ({
    entity_type: EntityType.CURRENCY,
    currency_uuid: 'Bitcoin_BTC',
    name: 'Bitcoin',
    short: 'BTC',
    prefix: '₿',
    suffix: '',
    decimals: 8,
    tags: [],
    _id: 'CURRENCY-Bitcoin_BTC',
    ...obj,
  });

  beforeEach(() => {
    mockLogger = new MockLogger('tests');
    persistence = new PersistenceStore(() => ({} as PouchDB.Database), mockLogger);
    mockStore = {
      merge: jest.fn(),
    } as unknown as MappedStore<ICurrency>;
  });

  const thenExpect = ({ updated, outdated, resolved }: { updated: object; outdated: object; resolved: object }) => {
    const state = {
      merge: (mockStore.merge as jest.Mock<unknown, unknown[]>).mock.calls,
      log: mockLogger.calls,
    };
    expect(state).toEqual({
      merge: [
        [
          resolved,
          {
            setUpdated: true,
          },
        ],
      ],
      log: [
        {
          level: 'info',
          text: 'tests:persistence:resolve conflict',
          args: [
            {
              updated,
              outdated,
              resolved,
            },
          ],
        },
      ],
    });
  };

  describe('resolveConflict', () => {
    it('take document with _rev over documents without _rev', () => {
      const a = sampleCurrency({ ...today, ...rev1 });
      const b = sampleCurrency({ ...yesterday });
      persistence.resolveConflict(mockStore, a, b);

      thenExpect({
        updated: a,
        outdated: b,
        resolved: { ...b, ...a, ...today },
      });
    });

    it('take document with _rev over documents without _rev reversed', () => {
      const a = sampleCurrency({ ...today });
      const b = sampleCurrency({ ...yesterday, ...rev1 });
      persistence.resolveConflict(mockStore, a, b);

      thenExpect({
        updated: b,
        outdated: a,
        resolved: { ...a, ...b },
      });
    });

    it('take document with newer _rev', () => {
      const a = sampleCurrency({ ...today, ...rev1 });
      const b = sampleCurrency({ ...yesterday, ...rev2 });
      persistence.resolveConflict(mockStore, a, b);

      thenExpect({
        updated: b,
        outdated: a,
        resolved: { ...a, ...b },
      });
    });

    it('take document with newer _rev a b reversed', () => {
      const a = sampleCurrency({ ...today, ...rev2 });
      const b = sampleCurrency({ ...yesterday, ...rev1 });
      persistence.resolveConflict(mockStore, a, b);

      thenExpect({
        updated: a,
        outdated: b,
        resolved: { ...b, ...a },
      });
    });

    it('take document with _rev over documents without _rev with older date', () => {
      const a = sampleCurrency({ ...today });
      const b = sampleCurrency({ ...yesterday, ...rev1 });
      persistence.resolveConflict(mockStore, a, b);

      thenExpect({
        updated: b,
        outdated: a,
        resolved: { ...a, ...b },
      });
    });

    it('chooses latest document between two with same _rev', () => {
      const a = sampleCurrency({ ...yesterday, ...rev1 });
      const b = sampleCurrency({ ...today, ...rev1 });
      persistence.resolveConflict(mockStore, a, b);

      thenExpect({
        updated: b,
        outdated: a,
        resolved: { ...a, ...b },
      });
    });
  });
});
