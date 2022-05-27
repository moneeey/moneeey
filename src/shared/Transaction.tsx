import { computed, makeObservable } from "mobx";
import { AccountStore, TAccountUUID } from "./Account";
import { TDate, compareDates } from "./Date";
import { IBaseEntity, TMonetary } from "./Entity";
import MappedStore from "./MappedStore";

export type TTransactionUUID = string;

export interface ITransaction extends IBaseEntity {
  transaction_uuid: TTransactionUUID;
  date: TDate;
  from_account: TAccountUUID;
  to_account: TAccountUUID;
  from_value: TMonetary;
  to_value: TMonetary;
  memo: string;
}

export class TransactionStore extends MappedStore<ITransaction> {
  constructor() {
    super((t) => t.transaction_uuid);
    makeObservable(this, {
      sorted: computed,
    })
  }

  sortTransactions(transactions: ITransaction[]): ITransaction[] {
    return transactions.sort((a, b) => compareDates(a.date, b.date));
  }

  get sorted() {
    return this.sortTransactions(this.all);
  }

  viewAllWithAccount(account: TAccountUUID) {
    return this.viewAllWithAccounts([account]);
  }

  viewAllWithAccounts(accounts: TAccountUUID[]) {
    const accountSet = new Set(accounts);
    return this.sortTransactions(
      this.byPredicate((row) => accountSet.has(row.from_account) || accountSet.has(row.to_account))
    );
  }

  viewAllWithTag(tag: string, accountsStore: AccountStore) {
    return this.sortTransactions(
      this.byPredicate((row) => this.getAllTransactionTags(row, accountsStore).indexOf(tag) >= 0)
    );
  }

  viewAllNonPayees(accountsStore: AccountStore) {
    return this.viewAllWithAccounts(accountsStore.allNonPayees().map(act => act.account_uuid));
  }

  getAllTransactionTags(
    transaction: ITransaction,
    accountsStore: AccountStore
  ) {
    const from_acct = accountsStore.accountTags(transaction.from_account);
    const to_acct = accountsStore.accountTags(transaction.to_account);
    return [...from_acct, ...to_acct, ...transaction.tags];
  }
}
