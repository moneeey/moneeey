import { computed, makeObservable, observable } from 'mobx';

import { debounce, isEmpty } from 'lodash';

import { TDate, compareDates, currentDate, currentDateTime, parseDate } from '../utils/Date';
import { uuid } from '../utils/Utils';
import { EditorType } from '../components/editor/EditorProps';
import { EntityType, IBaseEntity, TMonetary, isEntityType } from '../shared/Entity';
import { Row } from '../components/VirtualTableEditor';
import MappedStore from '../shared/MappedStore';
import MoneeeyStore from '../shared/MoneeeyStore';
import Messages from '../utils/Messages';
import RunningBalance from '../utils/RunningBalance';

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

  runningBalance: RunningBalance;

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
        from_value: {
          title: Messages.transactions.amount,
          field: 'from_value',
          index: 3,
          editor: EditorType.TRANSACTION_VALUE,
        },
        memo: {
          title: Messages.transactions.memo,
          field: 'memo',
          index: 4,
          editor: EditorType.MEMO,
        },
      }),
      additionalSchema: () => ({
        running_balance: {
          title: Messages.transactions.running_balance,
          field: 'running_balance',
          index: 5,
          editor: EditorType.NUMBER,
          readOnly: true,
          isVisible: (context: object) => {
            return 'referenceAccount' in context && !isEmpty(context.referenceAccount);
          },
          isLoading: ({ entityId }: Row) => {
            return this.runningBalance.transactionRunningBalance.get(entityId)?.from_balance === null;
          },
          readValue: ({ entityId }: Row, context: object) => {
            const balances = this.runningBalance.transactionRunningBalance.get(entityId);
            if ('referenceAccount' in context && !isEmpty(context.referenceAccount)) {
              const { referenceAccount } = context;
              if (referenceAccount) {
                const transaction = this.byUuid(entityId);
                if (referenceAccount === transaction?.from_account) {
                  return balances?.from_balance;
                }
                if (referenceAccount === transaction?.to_account) {
                  return balances?.to_balance;
                }
              }
            }

            return balances?.from_balance || 0;
          },
        },
      }),
    });
    makeObservable(this, {
      sorted: computed,
      oldest_dt: observable,
      newest_dt: observable,
    });
    this.runningBalance = new RunningBalance(this.moneeeyStore.logger);
  }

  updateRunningBalance = debounce(() => {
    this.runningBalance.processAll(this.moneeeyStore.transactions.sorted);
  }, 1000);

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
      this.updateRunningBalance();
    }
  }

  sortTransactions(transactions: ITransaction[]): ITransaction[] {
    return transactions.sort((a, b) => compareDates(a.date, b.date));
  }

  get sorted() {
    return this.sortTransactions(this.all);
  }

  findAllAfter(date: TDate) {
    return this.sorted.filter((t) => t.date >= date);
  }

  viewAllWithAccount(account: TAccountUUID) {
    return this.viewAllWithAccounts([account]);
  }

  filterByAccounts(accounts: TAccountUUID[]) {
    const accountSet = new Set(accounts);

    return (row: ITransaction) => accountSet.has(row.from_account) || accountSet.has(row.to_account);
  }

  viewAllWithAccounts(accounts: TAccountUUID[]) {
    return this.sortTransactions(this.byPredicate(this.filterByAccounts(accounts)));
  }

  viewAllUnclassified() {
    return this.sortTransactions(this.byPredicate(this.filterByAccounts([])));
  }

  filterByTag(tag: string, accountsStore: AccountStore) {
    return (row: ITransaction) =>
      this.getAllTransactionTags(row, accountsStore)
        .map((taag) => taag.toLowerCase())
        .indexOf(tag.toLowerCase()) >= 0;
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

  replaceAccount(from_uuid: TAccountUUID, to_uuid: TAccountUUID) {
    this.viewAllWithAccount(from_uuid).forEach((t) => {
      const from_account = t.from_account === from_uuid ? to_uuid : t.from_account;
      const to_account = t.to_account === from_uuid ? to_uuid : t.to_account;
      this.merge({ ...t, from_account, to_account });
    });
  }
}

const isTransaction = isEntityType<ITransaction>(EntityType.TRANSACTION);

const mockTransaction = (
  data: Pick<ITransaction, 'transaction_uuid' | 'from_account' | 'to_account' | 'from_value'> & Partial<ITransaction>
) => ({
  entity_type: EntityType.TRANSACTION,
  to_value: data.from_value,
  date: '2023-02-01',
  memo: '',
  tags: [],
  ...data,
});

export { TransactionStore, TransactionStore as default, isTransaction, mockTransaction };
