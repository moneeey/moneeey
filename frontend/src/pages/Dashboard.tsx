import useMoneeeyStore from '../shared/useMoneeeyStore'
import { WealthGrowReport } from './Reports'
import TransactionTable from '../tables/TransactionTable'
import MoneeeyStore from '../shared/MoneeeyStore'
import { observer } from 'mobx-react'
import { ITransaction } from '../entities/Transaction'
import Messages from '../utils/Messages'

const RecentTransactions = observer(
  ({
    moneeyStore: { transactions, accounts, currencies },
  }: {
    moneeyStore: MoneeeyStore
  }) => {
    const recent = new Set(
      transactions.sorted.splice(0, 5).map((t) => t.transaction_uuid)
    )
    const schemaFilter = (row: ITransaction) => recent.has(row.transaction_uuid)
    const referenceAccount = ''
    return (
      <>
        <b>{Messages.dashboard.recent_transactions}</b>
        <TransactionTable
          {...{
            transactions,
            accounts,
            currencies,
            schemaFilter,
            referenceAccount,
          }}
        />
        ;
      </>
    )
  }
)

export default function Dashboard() {
  const moneeeyStore = useMoneeeyStore()

  return (
    <div>
      <WealthGrowReport />
      <RecentTransactions moneeyStore={moneeeyStore} />
    </div>
  )
}
