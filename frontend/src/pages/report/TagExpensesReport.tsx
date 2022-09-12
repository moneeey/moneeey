import { AccountType, TAccountUUID } from '../../entities/Account'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { ITransaction } from '../../entities/Transaction'
import Messages from '../../utils/Messages'
import { dateToPeriod, PeriodGroup, ReportDataMap } from './ReportUtils'
import { BaseReport, BaseColumnChart } from './BaseReport'
import MoneeeyStore from '../../shared/MoneeeyStore'

const tagExpensesProcess = (
  moneeeyStore: MoneeeyStore,
  transaction: ITransaction,
  period: PeriodGroup,
  data: ReportDataMap
) => {
  const sumTransactionTagExpenses = (
    account_uuid: TAccountUUID,
    transaction: ITransaction,
    value: number
  ) => {
    const account = moneeeyStore.accounts.byUuid(account_uuid)
    const is_payee = account?.type === AccountType.PAYEE
    const payee_tags = (!is_payee && account?.tags) || []
    const tags = new Set([...payee_tags, ...transaction.tags])
    tags.forEach((tag) => {
      const group_date = dateToPeriod(period, transaction.date)
      const group = group_date + tag
      const prev_balance = (data.get(group) || {}).value || 0
      const delta = is_payee ? value : -value
      const balance = prev_balance + delta
      data.set(group, {
        x: group_date,
        y: tag,
        value: balance,
      })
    })
  }
  sumTransactionTagExpenses(
    transaction.from_account,
    transaction,
    transaction.from_value
  )
  sumTransactionTagExpenses(
    transaction.to_account,
    transaction,
    transaction.to_value
  )
}

export function TagExpensesReport() {
  const { accounts } = useMoneeeyStore()

  return (
    <BaseReport
      accounts={accounts.allPayees}
      processFn={tagExpensesProcess}
      title={Messages.reports.tag_expenses}
      chartFn={(rows) => <BaseColumnChart rows={rows} />}
    />
  )
}
