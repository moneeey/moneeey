import { addDays } from 'date-fns';
import { AccountType } from '../shared/Account';
import { ICurrency } from '../shared/Currency';
import { TDate, parseDate, formatDate } from '../shared/Date';
import { EntityType, generateUuid, randomRange } from '../shared/Entity';
import { ITransaction } from '../shared/Transaction';

export const SampleCurrencies: ICurrency[] = [
  {
    entity_type: EntityType.CURRENCY,
    currency_uuid: generateUuid(),
    name: 'Brazillian Real',
    short: 'BRL',
    prefix: 'R$ ',
    suffix: '',
    decimals: 2,
    tags: []
  },
  {
    entity_type: EntityType.CURRENCY,
    currency_uuid: generateUuid(),
    name: 'Bitcoin',
    short: 'BTC',
    prefix: '',
    suffix: ' BTC',
    decimals: 8,
    tags: []
  }
];

export const SampleAccounts = [
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: 'MoneeeyBank',
    currency_uuid: SampleCurrencies[0].currency_uuid,
    created: '2020-02-15',
    type: AccountType.CHECKING,
    tags: []
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: 'MyEmployee',
    currency_uuid: SampleCurrencies[0].currency_uuid,
    created: '2020-02-15',
    type: AccountType.PAYEE,
    tags: ['tax']
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: 'SuperGroceriesMarket',
    currency_uuid: SampleCurrencies[0].currency_uuid,
    created: '2020-02-15',
    type: AccountType.PAYEE,
    tags: ['groceries', 'tax']
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: 'CoffeShop',
    currency_uuid: SampleCurrencies[0].currency_uuid,
    created: '2020-02-15',
    type: AccountType.PAYEE,
    tags: ['health', 'self']
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: 'BTC-Wallet',
    currency_uuid: SampleCurrencies[1].currency_uuid,
    created: '2020-02-20',
    type: AccountType.CHECKING,
    tags: ['crypto']
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: 'GameShot',
    currency_uuid: SampleCurrencies[0].currency_uuid,
    created: '2020-01-28',
    type: AccountType.PAYEE,
    tags: ['diamond', 'games', 'tax']
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: 'CooolBakery',
    currency_uuid: SampleCurrencies[0].currency_uuid,
    created: '2020-01-28',
    type: AccountType.PAYEE,
    tags: ['tax']
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: 'LocalRealState',
    currency_uuid: SampleCurrencies[0].currency_uuid,
    created: '2020-01-01',
    type: AccountType.PAYEE,
    tags: ['home']
  }
];

const advancingSampleDate = (initialDate: TDate, stepDays: number, quantity: number, schema: (d: TDate) => any) => {
  let currentDate = parseDate(initialDate);
  const objects = [];
  for (let i = 0; i < quantity; i++) {
    const formatted = formatDate(currentDate);
    objects.push(schema(formatted));
    currentDate = addDays(currentDate, stepDays);
  }
  return objects;
};

export const SampleTransactions: ITransaction[] = [
  ...advancingSampleDate('2020-02-15', 15, 24, (date) => ({
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date,
    from_account: SampleAccounts[1].account_uuid,
    to_account: SampleAccounts[0].account_uuid,
    from_value: 3600,
    to_value: 3600,
    memo: '',
    tags: []
  })),
  ...advancingSampleDate('2020-01-30', 15, 24, (date) => ({
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date,
    from_account: SampleAccounts[1].account_uuid,
    to_account: SampleAccounts[0].account_uuid,
    from_value: 2200,
    to_value: 2200,
    memo: '',
    tags: []
  })),
  ...advancingSampleDate('2020-01-30', 180, 4, (date) => ({
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date,
    from_account: SampleAccounts[1].account_uuid,
    to_account: SampleAccounts[0].account_uuid,
    from_value: 3200,
    to_value: 3200,
    memo: 'Bonus #tax #cool ##332133',
    tags: ['tax', 'cool']
  })),
  ...advancingSampleDate('2020-02-18', 6, 100, (date) => ({
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date,
    from_account: SampleAccounts[0].account_uuid,
    to_account: SampleAccounts[3].account_uuid,
    from_value: 12.11,
    to_value: 12.11,
    memo: 'Good CoffeShop in Amsterdam',
    tags: []
  })),
  ...advancingSampleDate('2020-02-22', 9, 20, (date) => ({
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date,
    from_account: SampleAccounts[0].account_uuid,
    to_account: SampleAccounts[3].account_uuid,
    from_value: 22.03,
    to_value: 22.03,
    memo: '',
    tags: []
  })),
  ...advancingSampleDate('2020-02-20', 30, 20, (date) => ({
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date,
    from_account: SampleAccounts[0].account_uuid,
    to_account: SampleAccounts[4].account_uuid,
    from_value: 2000,
    to_value: 0.005381138 + randomRange(-0.002, 0.002),
    memo: '',
    tags: []
  })),
  ...advancingSampleDate('2020-02-26', 30, 20, (date) => {
    const amnt = 328.71 + randomRange(-50, 50);
    return {
      entity_type: EntityType.TRANSACTION,
      transaction_uuid: generateUuid(),
      date,
      from_account: SampleAccounts[0].account_uuid,
      to_account: SampleAccounts[2].account_uuid,
      from_value: amnt,
      to_value: amnt,
      memo: '',
      tags: []
    };
  }),
  {
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date: '2020-02-23',
    from_account: SampleAccounts[0].account_uuid,
    to_account: SampleAccounts[5].account_uuid,
    from_value: 420.69,
    to_value: 420.69,
    memo: 'Legend of Links game',
    tags: []
  },
  ...advancingSampleDate('2020-02-24', 365, 2, (date) => ({
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date,
    from_account: SampleAccounts[0].account_uuid,
    to_account: SampleAccounts[6].account_uuid,
    from_value: 64.23,
    to_value: 64.23,
    memo: 'Cake for the ##wifeey',
    tags: []
  })),
  ...advancingSampleDate('2020-02-01', 30, 24, (date) => ({
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date,
    from_account: SampleAccounts[0].account_uuid,
    to_account: SampleAccounts[7].account_uuid,
    from_value: 4000.0,
    to_value: 4000.0,
    memo: '',
    tags: []
  }))
];
