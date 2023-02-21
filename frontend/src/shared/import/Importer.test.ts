import { ITransaction, mockTransaction } from '../../entities/Transaction';
import { EntityType } from '../Entity';

import {
  tokenMatchScoreMap,
  tokenScoreMap,
  tokenTopScores,
  tokenTransactionAccountScoreMap,
  tokensForTransactions,
} from './Importer';

const getTransactionTokens = (transaction: ITransaction) => [...transaction.tags];

fdescribe('Importer', () => {
  const expectedTokenMap = () =>
    new Map([
      ['fernando', 0.9],
      ['gas', 0.9],
      ['oil', 0.9],
      ['pix', 0.8],
      ['restaurant', 0.9],
      ['station', 0.9],
      ['transaction', 0.7],
    ]);

  it('tokenScoreMap', () => {
    expect(
      tokenScoreMap([
        'transaction',
        'pix',
        'fernando',
        'transaction',
        'pix',
        'restaurant',
        'transaction',
        'gas',
        'station',
        'oil',
      ])
    ).toEqual(expectedTokenMap());
  });

  it('tokenTopScores', () => {
    expect(tokenTopScores(['transaction', 'pix', 'fernando'], expectedTokenMap(), 3)).toEqual([
      { score: 0.9, token: 'fernando' },
      { score: 0.8, token: 'pix' },
      { score: 0.7, token: 'transaction' },
    ]);
  });

  it('tokenTransactionScoreMap', () => {
    const transaction = mockTransaction({
      transaction_uuid: 't1',
      from_account: 'a',
      to_account: 'b',
      from_value: 12,
      memo: 'hello world',
      tags: ['tagX'],
    });

    expect(tokensForTransactions(transaction, getTransactionTokens)).toEqual(['tagX', 'hello', 'world']);
  });

  it('tokenTransactionAccountScoreMap and tokenMatchScoreMap', () => {
    const transactions: ITransaction[] = [
      mockTransaction({
        transaction_uuid: 't1',
        from_account: 'banco',
        to_account: 'fernando',
        memo: 'transfer to fernando',
        from_value: 123,
      }),
      mockTransaction({
        transaction_uuid: 't2',
        from_account: 'banco',
        to_account: 'chocolate',
        memo: 'transfer to chocolate',
        from_value: 20,
      }),
      mockTransaction({
        transaction_uuid: 't3',
        from_account: 'banco',
        to_account: 'lua',
        memo: 'transfer to lua',
        from_value: 20,
      }),
      mockTransaction({
        transaction_uuid: 't4',
        from_account: 'banco',
        to_account: 'market_dolly',
        memo: 'groceries dolly market',
        tags: ['groceries'],
        from_value: 20,
      }),
      mockTransaction({
        transaction_uuid: 't5',
        from_account: 'xyz_company',
        to_account: 'banco',
        memo: 'salary xyz company',
        from_value: 300,
      }),
      mockTransaction({
        transaction_uuid: 't6',
        from_account: 'banco',
        to_account: 'market_super',
        memo: 'super market',
        tags: ['groceries'],
        from_value: 300,
      }),
    ];
    const scoreMap = tokenTransactionAccountScoreMap(transactions, getTransactionTokens, 2);

    const queries = [['transfer', 'to', 'fernando'], ['transfer', 'to', 'chocolate'], ['market'], ['salary']];

    expect(queries.map((query) => ({ query, matches: tokenMatchScoreMap(query, scoreMap, 4) }))).toEqual([
      {
        query: ['transfer', 'to', 'fernando'],
        matches: [
          {
            id: 'banco',
            score: 0.9473684210526316,
          },
          {
            id: 'fernando',
            score: 0.8947368421052632,
          },
          {
            id: 'chocolate',
            score: 0.8421052631578947,
          },
          {
            id: 'lua',
            score: 0.8421052631578947,
          },
        ],
      },
      {
        query: ['transfer', 'to', 'chocolate'],
        matches: [
          {
            id: 'banco',
            score: 0.9473684210526316,
          },
          {
            id: 'chocolate',
            score: 0.8947368421052632,
          },
          {
            id: 'fernando',
            score: 0.8421052631578947,
          },
          {
            id: 'lua',
            score: 0.8421052631578947,
          },
        ],
      },
      {
        query: ['market'],
        matches: [
          {
            id: 'market_dolly',
            score: 0.8947368421052632,
          },
          {
            id: 'market_super',
            score: 0.8947368421052632,
          },
        ],
      },
      {
        query: ['salary'],
        matches: [
          {
            id: 'xyz_company',
            score: 0.9473684210526316,
          },
        ],
      },
    ]);
  });
});
