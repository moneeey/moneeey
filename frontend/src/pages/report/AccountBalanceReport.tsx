import { AccountType, IAccount, TAccountUUID } from '../../entities/Account'
import { TDate } from '../../utils/Date'
import { TMonetary } from '../../shared/Entity'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { ITransaction } from '../../entities/Transaction'
import Messages from '../../utils/Messages'
import { dateToPeriod, PeriodGroup, ReportDataMap } from './ReportUtils'
import { BaseColumnChart, BaseReport } from './BaseReport'
import MoneeeyStore from '../../shared/MoneeeyStore'
import { observer } from 'mobx-react'

export const baseAccountBalanceReport =
  (fromIsPositive: boolean, filter: (account: IAccount) => boolean) =>
  (
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
      if (!account || !filter(account)) return
      const group_date = dateToPeriod(period, date)
      const key = group_date + account.account_uuid
      const prev_balance = (data.get(key) || {}).value || 0
      const balance = prev_balance + value
      data.set(key, { x: group_date, y: account.name, value: balance })
    }
    addBalanceToData(
      transaction.from_account,
      fromIsPositive ? transaction.from_value : -transaction.from_value,
      transaction.date
    )
    addBalanceToData(
      transaction.to_account,
      fromIsPositive ? -transaction.to_value : transaction.to_value,
      transaction.date
    )
  }

export const accountBalanceReport = baseAccountBalanceReport(
  false,
  (account) => account.type !== AccountType.PAYEE
)

export const AccountBalanceReport = observer(() => {
  const { accounts } = useMoneeeyStore()

  return (
    <BaseReport
      accounts={accounts.allNonPayees}
      processFn={accountBalanceReport}
      title={Messages.reports.account_balance}
      chartFn={(rows) => <BaseColumnChart rows={rows} />}
    />
  )
})
