import { AccountKind, TAccountUUID } from '../../entities/Account';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { ITransaction } from '../../entities/Transaction';
import Messages from '../../utils/Messages';

import MoneeeyStore from '../../shared/MoneeeyStore';
import { TMonetary } from '../../shared/Entity';
import { TDate } from '../../utils/Date';

import { BaseColumnChart, BaseReport } from './BaseReport';
import { PeriodGroup, ReportDataMap, dateToPeriod } from './ReportUtils';

const incomeVsExpensesProcess =
  (moneeeyStore: MoneeeyStore) => (transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
    const addBalanceToData = (acct: TAccountUUID, value: TMonetary, date: TDate) => {
      const account = moneeeyStore.accounts.byUuid(acct);
      if (!account) {
        return;
      }

      let kind = '';
      if (account.kind === AccountKind.PAYEE && value < 0) {
        kind = Messages.reports.expense;
      }
      if (account.kind !== AccountKind.PAYEE && value > 0) {
        kind = Messages.reports.income;
      }
      if (kind === '') {
        return;
      }
      const group_date = dateToPeriod(period, date);
      const key = group_date + kind;
      const prev_balance = (data.get(key) || {}).value || 0;
      const balance = prev_balance + value;
      data.set(key, { x: group_date, value: balance, y: kind });
    };
    addBalanceToData(transaction.from_account, transaction.from_value, transaction.date);
    addBalanceToData(transaction.to_account, transaction.to_value, transaction.date);
  };

const IncomeVsExpensesReport = function () {
  const moneeeyStore = useMoneeeyStore();
  const { accounts } = moneeeyStore;

  return (
    <BaseReport
      accounts={accounts.allPayees}
      processFn={incomeVsExpensesProcess(moneeeyStore)}
      title={Messages.reports.income_vs_expenses}
      chartFn={(rows) => <BaseColumnChart rows={rows} />}
    />
  );
};

export default IncomeVsExpensesReport;
