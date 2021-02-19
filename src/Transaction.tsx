import { AccountStore, TAccountUUID } from "./Account";
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

  viewAll() {
    return [...this.all()];
  }

  viewAllWithTag(tag: string, accountsStore: AccountStore) {
    return [...this.all()].filter((row) => {
      const from_acct = accountsStore.byUuid(row.from_account);
      const to_acct = accountsStore.byUuid(row.to_account);
      const all_tags = [...from_acct.tags, ...to_acct.tags, ...row.tags];
      return all_tags.indexOf(tag) >= 0;
    });
  }
}
