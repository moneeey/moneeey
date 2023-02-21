import { action, makeObservable, observable } from 'mobx';

import { TAccountUUID } from '../entities/Account';
import { ITransaction, TTransactionUUID } from '../entities/Transaction';

import { asyncProcess } from './Utils';

export default class RunningBalance {
  transactionRunningBalance = new Map<TTransactionUUID, null | number>();

  constructor() {
    makeObservable(this, {
      transactionRunningBalance: observable,
      update: action,
    });
  }

  async calculateTransactionRunningBalances(items: ITransaction[]) {
    return (
      await asyncProcess(
        items,
        (chunk, state) => {
          const changeRunningBalance = (item: ITransaction, account: TAccountUUID, amount: number) => {
            const previous = state.accountBalance.get(account) || 0;
            const balance = amount + previous;
            state.accountBalance.set(account, balance);
            state.transactionBalance.set(item.transaction_uuid, balance);
          };
          chunk.forEach((item) => {
            changeRunningBalance(item, item.from_account, -item.from_value);
            changeRunningBalance(item, item.to_account, item.to_value);
          });
        },
        {
          chunkSize: 200,
          chunkThrottle: 200,
          state: {
            accountBalance: new Map<TAccountUUID, number>(),
            transactionBalance: new Map<TTransactionUUID, null | number>(),
          },
        }
      )
    ).transactionBalance;
  }

  update(transaction_uuid: TTransactionUUID, balance: number | null) {
    this.transactionRunningBalance.set(transaction_uuid, balance);
  }

  async processAll(transactions: ITransaction[]) {
    for (const t of transactions) {
      if (!this.transactionRunningBalance.has(t.transaction_uuid)) {
        this.update(t.transaction_uuid, null);
      }
    }
    const balances = await this.calculateTransactionRunningBalances(transactions);
    for (const [key, value] of balances) {
      this.update(key, value);
    }
  }
}
