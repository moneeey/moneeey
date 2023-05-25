import { ITransaction, mockTransaction } from '../../entities/Transaction';
import { tokenize } from '../../utils/Utils';

import {
  tokenMatchScoreMap,
  tokenScoreMap,
  tokenTopScores,
  tokenTransactionAccountScoreMap,
  tokensForTransactions,
} from './Importer';

const getTransactionTokens = (transaction: ITransaction) => [...transaction.tags];

const sampleTransactions: ITransaction[] = [
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

describe('Importer', () => {
  it('tokenize', () => {
    expect(tokenize('hello 7/21 world 30% coupon')).toEqual(['hello', 'world', 'coupon']);
    expect(tokenize('some@bad*boys')).toEqual(['some', 'bad', 'boys']);
  });

  it('tokenScoreMap', () => {
    const tokens =
      '2836788741484086466019596043251807718469095087302450890762989257138040064396808737591754583512735764'.split('');

    expect(tokenScoreMap(tokens)).toMatchInlineSnapshot(`
      Map {
        "2" => 0.94,
        "8" => 0.86,
        "3" => 0.92,
        "6" => 0.9,
        "7" => 0.88,
        "4" => 0.89,
        "1" => 0.9299999999999999,
        "0" => 0.87,
        "9" => 0.91,
        "5" => 0.9,
      }
    `);
  });

  it('tokenTopScores', () => {
    expect(
      tokenTopScores(
        ['transaction', 'pix', 'fernando'],
        new Map([
          ['fernando', 0.9],
          ['gas', 0.9],
          ['oil', 0.9],
          ['pix', 0.8],
          ['restaurant', 0.9],
          ['station', 0.9],
          ['transaction', 0.7],
        ]),
        3
      )
    ).toEqual([
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
    const scoreMap = tokenTransactionAccountScoreMap(sampleTransactions, getTransactionTokens, 2);

    expect(scoreMap).toMatchInlineSnapshot(`
      {
        "banco": {
          "chocolate": 0.9473684210526316,
          "fernando": 0.9473684210526316,
        },
        "chocolate": {
          "chocolate": 0.9473684210526316,
          "transfer": 0.8421052631578947,
        },
        "fernando": {
          "fernando": 0.9473684210526316,
          "transfer": 0.8421052631578947,
        },
        "lua": {
          "lua": 0.9473684210526316,
          "transfer": 0.8421052631578947,
        },
        "market_dolly": {
          "dolly": 0.9473684210526316,
          "market": 0.8947368421052632,
        },
        "market_super": {
          "market": 0.8947368421052632,
          "super": 0.9473684210526316,
        },
        "xyz_company": {
          "salary": 0.9473684210526316,
          "xyz": 0.9473684210526316,
        },
      }
    `);

    const query = (tokens: string[]) => tokenMatchScoreMap(tokens, scoreMap, 4);

    expect(query(['transfer', 'to', 'fernando'])).toMatchInlineSnapshot(`
      [
        {
          "id": "banco",
          "score": 0.9473684210526316,
        },
        {
          "id": "fernando",
          "score": 0.8947368421052632,
        },
        {
          "id": "chocolate",
          "score": 0.8421052631578947,
        },
        {
          "id": "lua",
          "score": 0.8421052631578947,
        },
      ]
    `);
    expect(query(['transfer', 'to', 'chocolate'])).toMatchInlineSnapshot(`
      [
        {
          "id": "banco",
          "score": 0.9473684210526316,
        },
        {
          "id": "chocolate",
          "score": 0.8947368421052632,
        },
        {
          "id": "fernando",
          "score": 0.8421052631578947,
        },
        {
          "id": "lua",
          "score": 0.8421052631578947,
        },
      ]
    `);
    expect(query(['market'])).toMatchInlineSnapshot(`
      [
        {
          "id": "market_dolly",
          "score": 0.8947368421052632,
        },
        {
          "id": "market_super",
          "score": 0.8947368421052632,
        },
      ]
    `);
    expect(query(['transfer', 'salary'])).toMatchInlineSnapshot(`
      [
        {
          "id": "xyz_company",
          "score": 0.9473684210526316,
        },
        {
          "id": "fernando",
          "score": 0.8421052631578947,
        },
        {
          "id": "chocolate",
          "score": 0.8421052631578947,
        },
        {
          "id": "lua",
          "score": 0.8421052631578947,
        },
      ]
    `);
  });
});
