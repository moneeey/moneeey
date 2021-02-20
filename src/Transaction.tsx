import { AccountStore, IAccount, TAccountUUID } from "./Account";
import { IBaseEntity, TDate, TMonetary } from "./Entity";
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
    return super
      .all()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  viewAllWithAccount(account: TAccountUUID) {
    return [...this.all()].filter((row) => {
      return row.from_account === account || row.to_account === account;
    });
  }

  viewAllWithTag(tag: string, accountsStore: AccountStore) {
    return [...this.all()].filter((row) => {
      const getAccountTags = (account: TAccountUUID) => {
        const acct = accountsStore.byUuid(account);
        if (acct) return acct.tags;
        return [];
      };
      const from_acct = getAccountTags(row.from_account);
      const to_acct = getAccountTags(row.to_account);
      const all_tags = [...from_acct, ...to_acct, ...row.tags];
      return all_tags.indexOf(tag) >= 0;
    });
  }
}
