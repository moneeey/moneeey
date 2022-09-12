import {
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns'

import { TAccountUUID } from '../../entities/Account'
import {
  formatDate,
  formatDateAs,
  parseDate,
  TDate,
  TDateFormat,
} from '../../utils/Date'
import { TMonetary } from '../../shared/Entity'
import MoneeeyStore from '../../shared/MoneeeyStore'
import { ITransaction } from '../../entities/Transaction'
import { asyncProcess } from '../../utils/Utils'
import Messages from '../../utils/Messages'

export interface AsyncProcessTransactions {
  accounts: TAccountUUID[]
  fn: (transaction: ITransaction, stt: ReportAsyncState) => void
  period: PeriodGroup
  moneeeyStore: MoneeeyStore
  setRows: (t: ITransaction[]) => void
  setProgress: (v: number) => void
}

export interface ReportDataPoint {
  date: TDate
  balance: TMonetary
  label: string
}

export type ReportDataMap = Map<string, ReportDataPoint>

export interface ReportAsyncState {
  moneeeyStore: MoneeeyStore
  period: PeriodGroup
  data: ReportDataMap
}

export async function asyncProcessTransactionsForAccounts({
  accounts,
  fn,
  period,
  moneeeyStore,
  setRows,
  setProgress,
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
  setRows(
    moneeeyStore.transactions.sortTransactions([...processed.data.values()])
  )
  setProgress(0)
}

export interface PeriodGroup {
  label: string
  groupFn: (_date: Date) => Date
  formatter: (_date: Date) => string
  order: number
}

export const noopFormatter = <T,>(o: T): string => '' + o
export const patternFormatter = (pattern: string) => (date: Date) =>
  formatDateAs(formatDate(date), pattern)

export const PeriodGroups: { [_name: string]: PeriodGroup } = {
  Day: {
    label: Messages.util.day,
    groupFn: startOfDay,
    formatter: patternFormatter(TDateFormat),
    order: 0,
  },
  Week: {
    label: Messages.util.week,
    groupFn: startOfWeek,
    formatter: patternFormatter('yyyy ww'),
    order: 1,
  },
  Month: {
    label: Messages.util.month,
    groupFn: startOfMonth,
    formatter: noopFormatter,
    order: 2,
  },
  Quarter: {
    label: Messages.util.quarter,
    groupFn: startOfQuarter,
    formatter: noopFormatter,
    order: 3,
  },
  Year: {
    label: Messages.util.year,
    groupFn: startOfYear,
    formatter: noopFormatter,
    order: 4,
  },
}

export function dateToPeriod(period: PeriodGroup, date: TDate) {
  return formatDate(period.groupFn(parseDate(date)))
}
