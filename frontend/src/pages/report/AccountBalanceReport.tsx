import { Column } from '@ant-design/charts'
import React from 'react'

import { AccountType, TAccountUUID } from '../../entities/Account'
import { TDate } from '../../utils/Date'
import { TMonetary } from '../../shared/Entity'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Loading from '../../components/Loading'
import { ITransaction } from '../../entities/Transaction'
import Messages from '../../utils/Messages'
import {
  ReportAsyncState,
  dateToPeriod,
  PeriodGroups,
  asyncProcessTransactionsForAccounts,
} from './ReportUtils'
import { DateGroupingSelector } from './DateGroupingSelector'

const accountBalanceReport = (
  transaction: ITransaction,
  stt: ReportAsyncState
) => {
  const addBalanceToData = (
    acct: TAccountUUID,
    value: TMonetary,
    date: TDate
  ) => {
    const account = stt.moneeeyStore.accounts.byUuid(acct)
    if (!account || account.type === AccountType.PAYEE) return
    const group_date = dateToPeriod(stt.period, date)
    const key = group_date + account.account_uuid
    const prev_balance = (stt.data.get(key) || {}).balance || 0
    const balance = prev_balance + value
    stt.data.set(key, { date: group_date, balance, label: account.name })
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

export function AccountBalanceReport() {
  const [period, setPeriod] = React.useState(PeriodGroups.Week)
  const [rows, setRows] = React.useState([] as ITransaction[])
  const [progress, setProgress] = React.useState(0)
  const moneeeyStore = useMoneeeyStore()
  React.useEffect(() => {
    const personal_accounts = moneeeyStore.accounts.allNonPayees.map(
      (act) => act.account_uuid
    )
    asyncProcessTransactionsForAccounts({
      accounts: personal_accounts,
      fn: accountBalanceReport,
      period,
      moneeeyStore,
      setRows,
      setProgress,
    })
  }, [moneeeyStore, period, setProgress, setRows])

  return (
    <>
      <h2>{Messages.reports.account_balance}</h2>
      <DateGroupingSelector setPeriod={setPeriod} period={period} />
      <Loading loading={progress !== 0} progress={progress}>
        <Column
          {...{
            data: rows,
            height: 400,
            yField: 'balance',
            xField: 'date',
            seriesField: 'label',
            connectNulls: true,
            smooth: true,
            point: {
              size: 5,
              shape: 'diamond',
            },
          }}
        />
      </Loading>
    </>
  )
}
