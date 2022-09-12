import { Column } from '@ant-design/charts'
import React from 'react'

import { AccountType, TAccountUUID } from '../../entities/Account'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Loading from '../../components/Loading'
import { ITransaction } from '../../entities/Transaction'
import Messages from '../../utils/Messages'
import {
  PeriodGroups,
  ReportAsyncState,
  dateToPeriod,
  asyncProcessTransactionsForAccounts,
} from './ReportUtils'
import { DateGroupingSelector } from './DateGroupingSelector'

const tagExpensesProcess = (
  transaction: ITransaction,
  stt: ReportAsyncState
) => {
  const sumTransactionTagExpenses = (
    account_uuid: TAccountUUID,
    transaction: ITransaction,
    value: number
  ) => {
    const account = stt.moneeeyStore.accounts.byUuid(account_uuid)
    const is_payee = account?.type === AccountType.PAYEE
    const payee_tags = (!is_payee && account?.tags) || []
    const tags = new Set([...payee_tags, ...transaction.tags])
    tags.forEach((tag) => {
      const group_date = dateToPeriod(stt.period, transaction.date)
      const group = group_date + tag
      const prev_balance = (stt.data.get(group) || {}).balance || 0
      const delta = is_payee ? value : -value
      const balance = prev_balance + delta
      stt.data.set(group, {
        date: group_date,
        balance,
        label: tag,
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
  const [period, setPeriod] = React.useState(PeriodGroups.Month)
  const moneeeyStore = useMoneeeyStore()
  const [rows, setRows] = React.useState([] as ITransaction[])
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    const payee_accounts = moneeeyStore.accounts.allPayees.map(
      (act) => act.account_uuid
    )
    asyncProcessTransactionsForAccounts({
      accounts: payee_accounts,
      fn: tagExpensesProcess,
      period,
      moneeeyStore,
      setRows,
      setProgress,
    })
  }, [moneeeyStore, period, setProgress, setRows])

  return (
    <>
      <h2>{Messages.reports.tag_expenses}</h2>
      <DateGroupingSelector setPeriod={setPeriod} period={period} />
      <Loading loading={progress !== 0} progress={progress}>
        <Column
          {...{
            data: rows,
            height: 400,
            xField: 'date',
            yField: 'balance',
            seriesField: 'label',
          }}
        />
      </Loading>
    </>
  )
}
