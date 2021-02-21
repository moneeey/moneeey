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
  }

  all() {
    return super.all().sort((a, b) => compareDates(a.date, b.date));
  }

  viewAllWithAccount(account: TAccountUUID) {
    return this.viewAllWithAccounts([account]);
  }

  viewAllWithAccounts(accounts: TAccountUUID[]) {
    return [...this.all()].filter((row) => {
      return (
        accounts.includes(row.from_account) || accounts.includes(row.to_account)
      );
    });
  }

  viewAllWithTag(tag: string, accountsStore: AccountStore) {
    return [...this.all()].filter((row) => {
      const all_tags = this.getAllTransactionTags(row, accountsStore);
      return all_tags.indexOf(tag) >= 0;
    });
  }

  getAllTransactionTags(
    transaction: ITransaction,
    accountsStore: AccountStore
  ) {
    const getAccountTags = (account: TAccountUUID) => {
      const acct = accountsStore.byUuid(account);
      if (acct) return acct.tags;
      return [];
    };
    const from_acct = getAccountTags(transaction.from_account);
    const to_acct = getAccountTags(transaction.to_account);
    return [...from_acct, ...to_acct, ...transaction.tags];
  }
}
