import { computed, makeObservable } from 'mobx'

import { AccountStore, TAccountUUID } from './Account'
import { compareDates, currentDate, currentDateTime, TDate } from '../utils/Date'
import { tokenize, uuid } from '../utils/Utils'
import { EditorType } from '../components/editor/EditorProps'
import { IBaseEntity, TMonetary, EntityType, isEntityType } from '../shared/Entity'
import MappedStore from '../shared/MappedStore'
import MoneeeyStore from '../shared/MoneeeyStore'
import { compact, filter, flatten, includes, isEmpty, map, sortBy } from 'lodash'

export type TTransactionUUID = string;

export interface ITransaction extends IBaseEntity {
  transaction_uuid: TTransactionUUID;
  date: TDate;
  from_account: TAccountUUID;
  to_account: TAccountUUID;
  from_value: TMonetary;
  to_value: TMonetary;
  memo: string;
  import_id?: string;
  import_data?: string;
}

class TransactionStore extends MappedStore<ITransaction> {
  constructor(moneeeyStore: MoneeeyStore) {
    super(
      moneeeyStore,
      (t) => t.transaction_uuid,
      () => ({
        entity_type: EntityType.TRANSACTION,
        transaction_uuid: uuid(),
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
      () => ({
        date: {
          title: 'Date',
          field: 'date',
          index: 0,
          editor: EditorType.DATE,
          defaultSortOrder: 'ascend',
        },
        from_account: {
          title: 'From',
          field: 'from_account',
          index: 1,
          editor: EditorType.ACCOUNT,
        },
        to_account: {
          title: 'To',
          field: 'to_account',
          index: 2,
          editor: EditorType.ACCOUNT,
        },
        memo: {
          title: 'Memo',
          field: 'memo',
          index: 3,
          editor: EditorType.MEMO,
        },
        from_value: {
          title: 'Value',
          field: 'from_value',
          index: 4,
          editor: EditorType.TRANSACTION_VALUE,
        },
        created: {
          title: 'Created',
          field: 'created',
          readOnly: true,
          index: 7,
          editor: EditorType.DATE,
        },
      })
    )
    makeObservable(this, {
      sorted: computed
    })
  }

  sortTransactions(transactions: ITransaction[]): ITransaction[] {
    return transactions.sort((a, b) => compareDates(a.date, b.date))
  }

  get sorted() {
    return this.sortTransactions(this.all)
  }

  viewAllWithAccount(account: TAccountUUID) {
    return this.viewAllWithAccounts([account])
  }

  filterByAccounts(accounts: TAccountUUID[]) {
    const accountSet = new Set(accounts)
    return (row: ITransaction) => accountSet.has(row.from_account) || accountSet.has(row.to_account) || (isEmpty(row.from_account) && isEmpty(row.to_account))
  }

  viewAllWithAccounts(accounts: TAccountUUID[]) {
    return this.sortTransactions(this.byPredicate(this.filterByAccounts(accounts)))
  }

  filterByTag(tag: string, accountsStore: AccountStore) {
    return (row: ITransaction) => this.getAllTransactionTags(row, accountsStore).indexOf(tag) >= 0
  }

  viewAllWithTag(tag: string, accountsStore: AccountStore) {
    return this.sortTransactions(this.byPredicate(this.filterByTag(tag, accountsStore)))
  }

  viewAllNonPayees(accountsStore: AccountStore) {
    return this.viewAllWithAccounts(accountsStore.allNonPayees.map((act) => act.account_uuid))
  }

  getAllTransactionTags(transaction: ITransaction, accountsStore: AccountStore) {
    const from_acct = accountsStore.accountTags(transaction.from_account)
    const to_acct = accountsStore.accountTags(transaction.to_account)
    return [...from_acct, ...to_acct, ...transaction.tags]
  }

  get tokenMap() {
    console.time('Transactions.tokenMap')
    const tokenMap = this.all.reduce((accum, transaction) => {
      const tokens = [
        ...transaction.tags,
        ...tokenize(transaction.memo),
        ...tokenize(transaction.import_data),
        ...tokenize(transaction.import_id),
      ]
      accum.set(transaction, tokens)
      return accum
    }, new Map<ITransaction, string[]>)
    console.timeEnd('Transactions.tokenMap')
    return tokenMap
  }


  findAccountsForTokens(referenceAccount: TAccountUUID, tokenMap: Map<ITransaction, string[]>, _tokens: string[]) {
    const tokens = compact(flatten(_tokens.map(s => tokenize(s.toLowerCase()))))
    console.time('findAccountsForTokens')
    const matching = map(Array.from(tokenMap.entries()), ([transaction, transactionTokens]) => {
      const matching = transactionTokens.filter(tok => includes(tokens, tok))
      return {
        transaction,
        matching,
        count: matching.length,
      }
    })
    const highestMatches = sortBy(matching, r => r.count).filter(r => r.count > 0).slice(0, 5)
    const accounts = filter(flatten(highestMatches.map(m => [m.transaction.from_account, m.transaction.to_account])),
      account_uuid => account_uuid !== referenceAccount)
    console.timeEnd('findAccountsForTokens')
    console.log('findAccountsForTokens', { referenceAccount, tokenMap, tokens, accounts })
    return accounts
  }
}

const isTransaction = isEntityType<ITransaction>(EntityType.TRANSACTION)


export { TransactionStore, TransactionStore as default, isTransaction }