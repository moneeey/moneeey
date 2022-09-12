import { AccountType, TAccountUUID } from '../../entities/Account'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { ITransaction } from '../../entities/Transaction'
import Messages from '../../utils/Messages'
import { dateToPeriod, PeriodGroup, ReportDataMap } from './ReportUtils'
import { BaseReport, BaseColumnChart } from './BaseReport'
import MoneeeyStore from '../../shared/MoneeeyStore'
import { TMonetary } from '../../shared/Entity'
import { TDate } from '../../utils/Date'

const incomeVsExpensesProcess = (
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
    if (!account) return

    let kind = ''
    if (account.type === AccountType.PAYEE && value < 0) {
      kind = Messages.reports.expense
    }
    if (account.type !== AccountType.PAYEE && value > 0) {
      kind = Messages.reports.income
    }
    if (kind === '') return
    const group_date = dateToPeriod(period, date)
    const key = group_date + kind
    const prev_balance = (data.get(key) || {}).value || 0
    const balance = prev_balance + value
    data.set(key, { x: group_date, value: balance, y: kind })
  }
  addBalanceToData(
    transaction.from_account,
    transaction.from_value,
    transaction.date
  )
  addBalanceToData(
    transaction.to_account,
    transaction.to_value,
    transaction.date
  )
}

export function IncomeVsExpensesReport() {
  const { accounts } = useMoneeeyStore()

  return (
    <BaseReport
      accounts={accounts.allPayees}
      processFn={incomeVsExpensesProcess}
      title={Messages.reports.income_vs_expenses}
      chartFn={(rows) => <BaseColumnChart rows={rows} />}
    />
  )
}
