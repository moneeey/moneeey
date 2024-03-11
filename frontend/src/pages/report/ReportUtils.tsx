import { startOfDay, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from 'date-fns';

import { TAccountUUID } from '../../entities/Account';
import { TDate, TDateFormat, formatDate, formatDateAs, parseDate } from '../../utils/Date';
import MoneeeyStore from '../../shared/MoneeeyStore';
import { ITransaction } from '../../entities/Transaction';
import { asyncProcess } from '../../utils/Utils';
import { TMonetary } from '../../shared/Entity';
import { TMessages } from '../../utils/Messages';

export interface AsyncProcessTransactions {
  moneeeyStore: MoneeeyStore;
  processFn: AsyncProcessTransactionFn;
  accounts: TAccountUUID[];
  period: PeriodGroup;
  setProgress: (v: number) => void;
}

export type AsyncProcessTransactionFn = (transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => void;

export type ReportDataMap = {
  columns: Set<string>;
  points: Map<TDate, Record<string, TMonetary>>;
};

export const NewReportDataMap = (): ReportDataMap => ({
  columns: new Set<string>(),
  points: new Map(),
});

export const asyncProcessTransactionsForAccounts = async function ({
  moneeeyStore,
  accounts,
  processFn,
  period,
  setProgress,
}: AsyncProcessTransactions) {
  const transactions = moneeeyStore.transactions.viewAllWithAccounts(accounts);

  const result = await asyncProcess(
    transactions,
    (chunk, data, percentage) => {
      setProgress(percentage);
      chunk.forEach((t) => processFn(t, period, data));
    },
    {
      state: NewReportDataMap(),
      chunkSize: 400,
      chunkThrottle: 10,
    }
  );

  return result;
};

export interface PeriodGroup {
  label: string;
  groupFn: (_date: Date) => Date;
  formatter: (_date: TDate) => string;
  order: number;
}

export const patternFormatter = (pattern: string) => (date: TDate) =>
  date.length === TDateFormat.length ? formatDateAs(date, pattern) : date;

export const dateToPeriod = function (period: PeriodGroup, date: TDate) {
  return formatDate(period.groupFn(parseDate(date)));
};

export function PeriodGroups(Messages: TMessages): {
  Day: PeriodGroup;
  Week: PeriodGroup;
  Month: PeriodGroup;
  Quarter: PeriodGroup;
  Year: PeriodGroup;
} {
  return {
    Day: {
      label: Messages.util.day,
      groupFn: startOfDay,
      formatter: patternFormatter(TDateFormat),
      order: 0,
    },
    Week: {
      label: Messages.util.week,
      groupFn: startOfWeek,
      formatter: patternFormatter('yyyy Lo'),
      order: 1,
    },
    Month: {
      label: Messages.util.month,
      groupFn: startOfMonth,
      formatter: patternFormatter('yyyy-LL'),
      order: 2,
    },
    Quarter: {
      label: Messages.util.quarter,
      groupFn: startOfQuarter,
      formatter: patternFormatter('yyyy QQQ'),
      order: 3,
    },
    Year: {
      label: Messages.util.year,
      groupFn: startOfYear,
      formatter: patternFormatter('yyyy'),
      order: 4,
    },
  };
}
