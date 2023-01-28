import { AccountKind, TAccountUUID } from '../../entities/Account';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { ITransaction } from '../../entities/Transaction';
import Messages from '../../utils/Messages';

import MoneeeyStore from '../../shared/MoneeeyStore';

import { PeriodGroup, ReportDataMap, dateToPeriod } from './ReportUtils';
import { BaseColumnChart, BaseReport } from './BaseReport';

const tagExpensesProcess =
  (moneeeyStore: MoneeeyStore) => (transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
    const sumTransactionTagExpenses = (account_uuid: TAccountUUID, value: number) => {
      const account = moneeeyStore.accounts.byUuid(account_uuid);
      const is_payee = account?.kind === AccountKind.PAYEE;
      const payee_tags = (is_payee && account?.tags) || [];
      const tags = new Set([...payee_tags, ...transaction.tags]);
      tags.forEach((tag) => {
        const key = dateToPeriod(period, transaction.date);
        const prev_record = data.points.get(key);
        const prev_balance = (prev_record && prev_record[tag]) || 0;
        const delta = is_payee ? value : -value;
        const balance = prev_balance + delta;
        data.columns.add(tag);
        data.points.set(key, { ...prev_record, [tag]: balance });
      });
    };
    sumTransactionTagExpenses(transaction.from_account, transaction.from_value);
    sumTransactionTagExpenses(transaction.to_account, transaction.to_value);
  };

const TagExpensesReport = function () {
  const moneeeyStore = useMoneeeyStore();
  const { accounts } = moneeeyStore;

  return (
    <BaseReport
      accounts={accounts.allPayees}
      processFn={tagExpensesProcess(moneeeyStore)}
      title={Messages.reports.tag_expenses}
      chartFn={(data, period) => <BaseColumnChart data={data} xFormatter={period.formatter} />}
    />
  );
};

export default TagExpensesReport;
