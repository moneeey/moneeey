import { AccountType } from '../../entities/Account'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'
import { BaseColumnChart, BaseReport } from './BaseReport'
import { observer } from 'mobx-react'
import { baseAccountBalanceReport } from './AccountBalanceReport'

export const payeeBalanceReport = baseAccountBalanceReport(
  true,
  (account) => account.type === AccountType.PAYEE
)

export const PayeeBalanceReport = observer(() => {
  const { accounts } = useMoneeeyStore()

  return (
    <BaseReport
      accounts={accounts.allPayees}
      processFn={payeeBalanceReport}
      title={Messages.reports.payee_balance}
      chartFn={(rows) => <BaseColumnChart rows={rows} />}
    />
  )
})
