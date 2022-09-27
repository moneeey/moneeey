import {
  compact,
  filter,
  flatten,
  groupBy,
  head,
  identity,
  includes,
  isEmpty,
  reduce,
  reverse,
  sortBy,
  uniq,
  values,
} from 'lodash'

import { TAccountUUID } from '../../entities/Account'
import { ITransaction } from '../../entities/Transaction'
import { tokenize } from '../../utils/Utils'
import MoneeeyStore from '../MoneeeyStore'

class Importer {
  private moneeeyStore: MoneeeyStore

  constructor(moneeeyStore: MoneeeyStore) {
    this.moneeeyStore = moneeeyStore
  }

  get tokenMap() {
    const tokenMap = this.moneeeyStore.transactions.all.reduce((accum, transaction) => {
      const tokens = uniq(
        compact(flatten([...transaction.tags, ...tokenize(transaction.memo), ...tokenize(transaction.import_data)]))
      )
      accum.set(transaction, tokens)

      return accum
    }, new Map<ITransaction, string[]>())

    return tokenMap
  }

  findAccountsForTokens(referenceAccount: TAccountUUID, tokenMap: Map<ITransaction, string[]>, _tokens: string[]) {
    const MAX_MATCH = 100
    const tokens = compact(flatten(_tokens.map((s) => tokenize(s))))
    let maxCommons = 0
    const matchingTransactions = reduce(
      Array.from(tokenMap.entries()),
      (results, [transaction, transactionTokens]) => {
        if (results.length < MAX_MATCH) {
          const common: string[] = transactionTokens.filter((tok) => includes(tokens, tok))
          if (common.length > 0) {
            results.push({ transaction, common })
            maxCommons = Math.max(maxCommons, common.length)
          }
        }

        return results
      },
      [] as { transaction: ITransaction; common: string[] }[]
    )
    const filterNonReferenceAccount = (account_uuid: TAccountUUID) =>
      !isEmpty(account_uuid) && account_uuid !== referenceAccount
    const matchingTransactionAccounts = matchingTransactions
      .filter((m) => m.common.length >= maxCommons)
      .map((m) => [m.transaction.from_account, m.transaction.to_account])
    const nonReferenceAccount = filter(flatten(matchingTransactionAccounts), filterNonReferenceAccount)
    const mostMatchedFirst = uniq(reverse(sortBy(values(groupBy(nonReferenceAccount, identity)), (v) => v.length)))
    const mostMatched = compact(mostMatchedFirst.map(head)).map((account_uuid) => ({
      account_uuid,
      name: this.moneeeyStore.accounts.nameForUuid(account_uuid),
    }))

    return mostMatched.map((m) => m.account_uuid)
  }

  findForImportId(import_id: string[]) {
    return this.moneeeyStore.transactions.all.find((t) => {
      const tids = this.importId(t)

      return import_id.find((id) => tids.includes(id))
    })
  }

  importId(transaction: ITransaction) {
    return compact([transaction.from_account, transaction.to_account])
      .sort()
      .map((account) => `date=${transaction.date} account=${account} value=${transaction.from_value}`)
  }
}

export { Importer, Importer as default }
