import { action, makeObservable, observable } from 'mobx';

import { TAccountUUID } from '../entities/Account';
import { ITransaction, TTransactionUUID } from '../entities/Transaction';
import Logger from '../shared/Logger';

import { asyncProcess } from './Utils';

type FromToBalance = {
  from_balance: null | number;
  to_balance: null | number;
};

export default class RunningBalance {
  transactionRunningBalance = new Map<TTransactionUUID, FromToBalance>();

  version = 0;

  logger: Logger;

  constructor(parent?: Logger) {
    makeObservable(this, {
      transactionRunningBalance: observable,
      update: action,
    });
    this.logger = new Logger('runningBalance', parent);
  }

  async calculateTransactionRunningBalances(items: ITransaction[]) {
    const forVersion = this.version;

    return (
      await asyncProcess(
        items,
        (chunk, state) => {
          if (forVersion !== this.version) {
            this.logger.info('calculateTransactionRunningBalances aborted');

            return;
          }
          const changeRunningBalance = (item: ITransaction, account: TAccountUUID, amount: number) => {
            const previous = state.accountBalance.get(account) || 0;
            const balance = amount + previous;
            state.accountBalance.set(account, balance);

            return balance;
          };
          chunk.forEach((item) => {
            const from_balance = changeRunningBalance(item, item.from_account, -item.from_value);
            const to_balance = changeRunningBalance(item, item.to_account, item.to_value);
            state.transactionBalance.set(item.transaction_uuid, { from_balance, to_balance });
          });
        },
        {
          chunkSize: 50,
          chunkThrottle: 50,
          state: {
            accountBalance: new Map<TAccountUUID, number>(),
            transactionBalance: new Map<TTransactionUUID, FromToBalance>(),
          },
        }
      )
    ).transactionBalance;
  }

  update(transaction_uuid: TTransactionUUID, balances: FromToBalance) {
    this.transactionRunningBalance.set(transaction_uuid, balances);
  }

  async processAll(transactions: ITransaction[]) {
    this.version += 1;
    for (const t of transactions) {
      if (!this.transactionRunningBalance.has(t.transaction_uuid)) {
        this.update(t.transaction_uuid, {
          from_balance: null,
          to_balance: null,
        });
      }
    }
    const transactionBalances = await this.calculateTransactionRunningBalances(transactions);
    for (const [transaction_uuid, balances] of transactionBalances) {
      this.update(transaction_uuid, balances);
    }
  }
}
