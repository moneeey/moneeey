import { observer } from 'mobx-react'

import TransactionTable from '../tables/TransactionTable'
import { IAccount } from '../entities/Account'
import { HomeRoute } from './HomeRouter'
import { IAppParameters, IRouteParameters, Route } from './Route'
import MoneeeyStore from '../shared/MoneeeyStore'
import { ITransaction } from '../entities/Transaction'

interface IAccountRoute extends IRouteParameters {
  account_name: string;
}

interface AccountTransactionProps {
  account_name: string;
  slug: (value: string) => string;
  moneeyStore: MoneeeyStore;
}

const AccountTransactions = observer(({ slug, account_name, moneeyStore: { transactions, accounts, currencies } }: AccountTransactionProps) => {
  const account = accounts.find((acc: IAccount) => slug(acc.name) === account_name)
  const account_uuid = account?.account_uuid || ''
  const filterByAccount = transactions.filterByAccounts([account_uuid])
  const schemaFilter = (row: ITransaction) => filterByAccount(row)
  const referenceAccount = account_uuid
  return <TransactionTable {...{ transactions, accounts, currencies, schemaFilter, referenceAccount, account_name }} />
})

class AccountRouter extends Route<IAccountRoute> {
  constructor() {
    super('/accounts/:account_name', HomeRoute)
    this.parent?.addChild(this)
  }

  render = ({ app, parameters }: { app: IAppParameters, parameters: IAccountRoute }) => {
    return <AccountTransactions slug={this.slug} account_name={parameters.account_name} moneeyStore={app.moneeeyStore} />
  }

  accountUrl(account: IAccount) {
    return this.url({ account_name: account.name })
  }
}

export const AccountRoute = new AccountRouter()