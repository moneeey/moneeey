import { computed, makeObservable, observable } from 'mobx';

import { isEmpty } from 'lodash';

import { TDate, compareDates, currentDate, currentDateTime, parseDate } from '../utils/Date';
import { uuid } from '../utils/Utils';
import { EditorType } from '../components/editor/EditorProps';
import { EntityType, IBaseEntity, TMonetary, isEntityType } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';
import MoneeeyStore from '../shared/MoneeeyStore';
import Messages from '../utils/Messages';

import { AccountStore, TAccountUUID } from './Account';

export type TTransactionUUID = string;

export interface ITransaction extends IBaseEntity {
  transaction_uuid: TTransactionUUID;
  date: TDate;
  from_account: TAccountUUID;
  to_account: TAccountUUID;
  from_value: TMonetary;
  to_value: TMonetary;
  memo: string;
  import_data?: string;
}

class TransactionStore extends MappedStore<ITransaction> {
  oldest_dt: Date = new Date();

  newest_dt: Date = new Date();

  constructor(moneeeyStore: MoneeeyStore) {
    super(moneeeyStore, {
      getUuid: (t) => t.transaction_uuid,
      factory: (id?: string) => ({
        entity_type: EntityType.TRANSACTION,
        transaction_uuid: id || uuid(),
        date: currentDate(),
        from_account: '',
        to_account: '',
        from_value: 0,
        to_value: 0,
        memo: '',
        tags: [],
        updated: currentDateTime(),
        created: currentDateTime(),
      }),
      schema: () => ({
        date: {
          title: Messages.util.date,
          field: 'date',
          index: 0,
          editor: EditorType.DATE,
          defaultSortOrder: 'ascend',
        },
        from_account: {
          title: Messages.transactions.from_account,
          field: 'from_account',
          index: 1,
          editor: EditorType.ACCOUNT,
        },
        to_account: {
          title: Messages.transactions.to_account,
          field: 'to_account',
          index: 2,
          editor: EditorType.ACCOUNT,
        },
        memo: {
          title: Messages.transactions.memo,
          field: 'memo',
          index: 3,
          editor: EditorType.MEMO,
        },
        from_value: {
          title: Messages.transactions.amount,
          field: 'from_value',
          index: 4,
          editor: EditorType.TRANSACTION_VALUE,
        },
        created: {
          title: Messages.util.created,
          field: 'created',
          readOnly: true,
          index: 7,
          editor: EditorType.DATE,
        },
      }),
    });
    makeObservable(this, {
      sorted: computed,
      oldest_dt: observable,
      newest_dt: observable,
    });
  }

  merge(item: ITransaction, options: { setUpdated: boolean } = { setUpdated: true }) {
    super.merge(item, options);
    if (!isEmpty(item.date)) {
      const dt = parseDate(item.date);
      if (dt) {
        if (dt.getTime() > this.newest_dt.getTime()) {
          this.newest_dt = new Date(dt);
        }
        if (dt.getTime() < this.oldest_dt.getTime()) {
          this.oldest_dt = new Date(dt);
        }
      }
    }
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

  filterByAccounts(accounts: TAccountUUID[]) {
    const accountSet = new Set(accounts);

    return (row: ITransaction) =>
      accountSet.has(row.from_account) ||
      accountSet.has(row.to_account) ||
      (isEmpty(row.from_account) && isEmpty(row.to_account));
  }

  viewAllWithAccounts(accounts: TAccountUUID[]) {
    return this.sortTransactions(this.byPredicate(this.filterByAccounts(accounts)));
  }

  filterByTag(tag: string, accountsStore: AccountStore) {
    return (row: ITransaction) => this.getAllTransactionTags(row, accountsStore).indexOf(tag) >= 0;
  }

  viewAllWithTag(tag: string, accountsStore: AccountStore) {
    return this.sortTransactions(this.byPredicate(this.filterByTag(tag, accountsStore)));
  }

  viewAllNonPayees(accountsStore: AccountStore) {
    return this.viewAllWithAccounts(accountsStore.allNonPayees.map((act) => act.account_uuid));
  }

  getAllTransactionTags(transaction: ITransaction, accountsStore: AccountStore) {
    const from_acct = accountsStore.accountTags(transaction.from_account);
    const to_acct = accountsStore.accountTags(transaction.to_account);

    return [...from_acct, ...to_acct, ...transaction.tags];
  }
}

const isTransaction = isEntityType<ITransaction>(EntityType.TRANSACTION);

export { TransactionStore, TransactionStore as default, isTransaction };
