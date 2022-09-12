import { AccountType, TAccountUUID } from '../../entities/Account'
import { TDate } from '../../utils/Date'
import { TMonetary } from '../../shared/Entity'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { ITransaction } from '../../entities/Transaction'
import Messages from '../../utils/Messages'
import { dateToPeriod, PeriodGroup, ReportDataMap } from './ReportUtils'
import { BaseReport, BaseColumnChart } from './BaseReport'
import MoneeeyStore from '../../shared/MoneeeyStore'

const wealthGrowProcess = (
  moneeeyStore: MoneeeyStore,
  transaction: ITransaction,
  period: PeriodGroup,
  data: ReportDataMap
) => {
  const addBalanceToData = (
    acct: TAccountUUID,
    value: TMonetary,
    date: TDate
  ) => {
    const account = moneeeyStore.accounts.byUuid(acct)
    if (!account || account.type === AccountType.PAYEE) return
    const group_date = dateToPeriod(period, date)
    const key = group_date + account.account_uuid
    const prev_balance = (data.get(key) || {}).value || 0
    const balance = prev_balance + value
    data.set(key, { x: group_date, value: balance, y: 'Wealth' })
  }
  addBalanceToData(
    transaction.from_account,
    -transaction.from_value,
    transaction.date
  )
  addBalanceToData(
    transaction.to_account,
    transaction.to_value,
    transaction.date
  )
}

export function WealthGrowReport() {
  const { accounts } = useMoneeeyStore()

  return (
    <BaseReport
      accounts={accounts.allPayees}
      processFn={wealthGrowProcess}
      title={Messages.reports.wealth_growth}
      chartFn={(rows) => <BaseColumnChart rows={rows} />}
    />
  )
}
