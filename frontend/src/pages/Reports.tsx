import { Column, Line } from '@ant-design/charts'
import { DownOutlined } from '@ant-design/icons'
import { Button, Dropdown, Menu } from 'antd'
import { startOfDay, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from 'date-fns'
import _ from 'lodash'
import React from 'react'

import { AccountType, TAccountUUID } from '../entities/Account'
import { formatDate, parseDate, TDate } from '../utils/Date'
import { TMonetary } from '../shared/Entity'
import MoneeeyStore from '../shared/MoneeeyStore'
import useMoneeeyStore from '../shared/useMoneeeyStore'
import Loading from '../components/Loading'
import { ITransaction } from '../entities/Transaction'
import { asyncProcess } from '../utils/Utils'

interface AsyncProcessTransactions {
  accounts: TAccountUUID[];
  fn: (transaction: ITransaction, stt: ReportAsyncState) => void;
  period: PeriodGroup;
  moneeeyStore: MoneeeyStore;
  setRows: (t: ITransaction[]) => void;
  setProgress: (v: number) => void;
}

async function asyncProcessTransactionsForAccounts({
  accounts,
  fn,
  period,
  moneeeyStore,
  setRows,
  setProgress
}: AsyncProcessTransactions) {
  const transactions = moneeeyStore.transactions.viewAllWithAccounts(accounts)
  const processed = await asyncProcess(
    transactions,
    (chunk, stt, _chunks, tasks, tasksTotal) => {
      setProgress(((tasksTotal - tasks) / tasksTotal) * 100)
      chunk.forEach((t) => fn(t, stt))
    },
    { moneeeyStore, data: new Map(), period }
  )
  setRows(moneeeyStore.transactions.sortTransactions([...processed.data.values()]))
  setProgress(0)
}

interface PeriodGroup {
  label: string;
  groupFn: (_date: Date) => Date;
  formatter: (_date: Date) => string;
  order: number;
}

const noopFormatter = <T,>(o: T): string => '' + o
const PeriodGroups: { [_name: string]: PeriodGroup } = {
  Day: { label: 'Day', groupFn: startOfDay, formatter: noopFormatter, order: 0 },
  Week: { label: 'Week', groupFn: startOfWeek, formatter: noopFormatter, order: 1 },
  Month: { label: 'Month', groupFn: startOfMonth, formatter: noopFormatter, order: 2 },
  Quarter: { label: 'Quarter', groupFn: startOfQuarter, formatter: noopFormatter, order: 3 },
  Year: { label: 'Year', groupFn: startOfYear, formatter: noopFormatter, order: 4 }
}

function dateToPeriod(period: PeriodGroup, date: TDate) {
  return formatDate(period.groupFn(parseDate(date)))
}

export function DateGroupingSelector({
  setPeriod,
  period
}: {
  setPeriod: (newPeriod: PeriodGroup) => void;
  period: PeriodGroup;
}) {
  return (
    <Dropdown
      overlay={
        <Menu>
          {_(_.values(PeriodGroups))
            .sortBy('order')
            .map((p) => (
              <Menu.Item key={p.label} onClick={() => setPeriod(p)}>
                {p.label}
              </Menu.Item>
            ))
            .value()}
        </Menu>
      }
      trigger={['click']}>
      <Button type='link' className='ant-dropdown-link' onClick={(e) => e.preventDefault()}>
        {period.label} <DownOutlined />
      </Button>
    </Dropdown>
  )
}

interface ReportDataPoint {
  date: TDate;
  balance: TMonetary;
  label: string;
}
type ReportDataMap = Map<string, ReportDataPoint>;
interface ReportAsyncState {
  moneeeyStore: MoneeeyStore;
  period: PeriodGroup;
  data: ReportDataMap;
}

const balanceGrowthProcess = (transaction: ITransaction, stt: ReportAsyncState) => {
  const addBalanceToData = (acct: TAccountUUID, value: TMonetary, date: TDate) => {
    const account = stt.moneeeyStore.accounts.byUuid(acct)
    if (!account || account.type === AccountType.PAYEE) return
    const group_date = dateToPeriod(stt.period, date)
    const key = group_date + account.account_uuid
    const prev_balance = (stt.data.get(key) || {}).balance || 0
    const balance = prev_balance + value
    stt.data.set(key, { date: group_date, balance, label: account.name })
  }
  addBalanceToData(transaction.from_account, -transaction.from_value, transaction.date)
  addBalanceToData(transaction.to_account, transaction.to_value, transaction.date)
}

export function BalanceGrowthReport() {
  const [period, setPeriod] = React.useState(PeriodGroups.Week)
  const [rows, setRows] = React.useState([] as ITransaction[])
  const [progress, setProgress] = React.useState(0)
  const moneeeyStore = useMoneeeyStore()
  React.useEffect(() => {
    const personal_accounts = moneeeyStore.accounts.allNonPayees.map((act) => act.account_uuid)
    asyncProcessTransactionsForAccounts({
      accounts: personal_accounts,
      fn: balanceGrowthProcess,
      period,
      moneeeyStore,
      setRows,
      setProgress
    })
  }, [moneeeyStore, period, setProgress, setRows])

  return (
    <>
      <h2>Balance Growth</h2>
      <DateGroupingSelector setPeriod={setPeriod} period={period} />
      <Loading loading={progress !== 0} progress={progress}>
        <Line
          {...{
            data: rows,
            height: 400,
            //xField: "date",
            yField: 'balance',
            xAxis: {
              field: 'date',
              label: {
                formatter: (x) => {
                  return period.formatter(parseDate(x))
                }
              }
            },
            seriesField: 'label',
            connectNulls: true,
            smooth: true,
            point: {
              size: 5,
              shape: 'diamond'
            }
          }}
        />
      </Loading>
    </>
  )
}

const tagExpensesProcess = (transaction: ITransaction, stt: ReportAsyncState) => {
  const sumTransactionTagExpenses = (account_uuid: TAccountUUID, transaction: ITransaction, value: number) => {
    const account = stt.moneeeyStore.accounts.byUuid(account_uuid)
    const is_payee = account?.type === AccountType.PAYEE
    const payee_tags = (!is_payee && account?.tags) || []
    const tags = new Set([...payee_tags, ...transaction.tags])
    tags.forEach((tag) => {
      const group_date = dateToPeriod(stt.period, transaction.date)
      const group = group_date + tag
      const prev_balance = (stt.data.get(group) || {}).balance || 0
      const delta = is_payee ? -value : value
      const balance = prev_balance + delta
      stt.data.set(group, {
        date: group_date,
        balance,
        label: tag
      })
    })
  }
  sumTransactionTagExpenses(transaction.from_account, transaction, transaction.from_value)
  sumTransactionTagExpenses(transaction.to_account, transaction, transaction.to_value)
}

export function TagExpensesReport() {
  const [period, setPeriod] = React.useState(PeriodGroups.Month)
  const moneeeyStore = useMoneeeyStore()
  const [rows, setRows] = React.useState([] as ITransaction[])
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    const payee_accounts = moneeeyStore.accounts.allPayees.map((act) => act.account_uuid)
    asyncProcessTransactionsForAccounts({
      accounts: payee_accounts,
      fn: tagExpensesProcess,
      period,
      moneeeyStore,
      setRows,
      setProgress
    })
  }, [moneeeyStore, period, setProgress, setRows])

  return (
    <>
      <h2>Tag Expenses</h2>
      <DateGroupingSelector setPeriod={setPeriod} period={period} />
      <Loading loading={progress !== 0} progress={progress}>
        <Column
          {...{
            data: rows,
            height: 400,
            xField: 'date',
            yField: 'balance',
            seriesField: 'label'
          }}
        />
      </Loading>
    </>
  )
}

export function Reports() {
  return (
    <>
      <BalanceGrowthReport />
      <TagExpensesReport />
    </>
  )
}
