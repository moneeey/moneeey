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
import MoneeeyStore from '../../shared/MoneeeyStore'
import { ITransaction } from '../../entities/Transaction'
import { asyncProcess } from '../../utils/Utils'
import Messages from '../../utils/Messages'
import { TMonetary } from '../../shared/Entity'

export interface AsyncProcessTransactions {
  moneeeyStore: MoneeeyStore
  processFn: AsyncProcessTransactionFn
  accounts: TAccountUUID[]
  period: PeriodGroup
  setProgress: (v: number) => void
}

export type AsyncProcessTransactionFn = (
  moneeeyStore: MoneeeyStore,
  transaction: ITransaction,
  period: PeriodGroup,
  data: ReportDataMap
) => void

export type ReportDataMap = Map<string, ReportDataPoint>

export interface ReportDataPoint {
  x: TDate
  y: string
  value: TMonetary
}

export async function asyncProcessTransactionsForAccounts({
  moneeeyStore,
  accounts,
  processFn,
  period,
  setProgress,
}: AsyncProcessTransactions) {
  const transactions = moneeeyStore.transactions.viewAllWithAccounts(accounts)
  const processed = await asyncProcess(
    transactions,
    (chunk, data, _chunks, tasks, tasksTotal) => {
      setProgress(((tasksTotal - tasks) / tasksTotal) * 100)
      chunk.forEach((t) => processFn(moneeeyStore, t, period, data))
    },
    new Map() as ReportDataMap
  )
  return Array.from(processed.values())
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

export function dateToPeriod(period: PeriodGroup, date: TDate) {
  return formatDate(period.groupFn(parseDate(date)))
}

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