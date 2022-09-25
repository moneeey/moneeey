import { observer } from 'mobx-react'

import { AccountType } from '../../entities/Account'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'

import { BaseColumnChart, BaseReport } from './BaseReport'
import { baseAccountBalanceReport } from './AccountBalanceReport'

const payeeBalanceReport = baseAccountBalanceReport(true, (account) => account.type === AccountType.PAYEE)

const PayeeBalanceReport = observer(() => {
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

export default PayeeBalanceReport
