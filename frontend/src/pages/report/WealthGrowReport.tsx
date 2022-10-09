import { AccountType, TAccountUUID } from '../../entities/Account';
import { TDate, compareDates } from '../../utils/Date';
import { TMonetary } from '../../shared/Entity';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { ITransaction } from '../../entities/Transaction';
import Messages from '../../utils/Messages';

import MoneeeyStore from '../../shared/MoneeeyStore';

import { PeriodGroup, ReportDataMap, dateToPeriod } from './ReportUtils';
import { BaseLineChart, BaseReport } from './BaseReport';

const wealthGrowProcess =
  (moneeeyStore: MoneeeyStore) => (transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
    const addBalanceToData = (acct: TAccountUUID, value: TMonetary, date: TDate) => {
      const account = moneeeyStore.accounts.byUuid(acct);
      if (!account || account.type === AccountType.PAYEE) {
        return;
      }
      const group_date = dateToPeriod(period, date);
      const key = group_date + account.account_uuid;
      const prev_balance = (data.get(key) || {}).value || 0;
      const balance = prev_balance + value;
      data.set(key, { x: group_date, value: balance, y: Messages.reports.wealth });
    };
    addBalanceToData(transaction.from_account, -transaction.from_value, transaction.date);
    addBalanceToData(transaction.to_account, transaction.to_value, transaction.date);
  };

const WealthGrowReport = function () {
  const moneeeyStore = useMoneeeyStore();
  const { accounts } = moneeeyStore;

  return (
    <BaseReport
      accounts={accounts.allPayees}
      processFn={wealthGrowProcess(moneeeyStore)}
      title={Messages.reports.wealth_growth}
      chartFn={(rows) => {
        const sorted = rows.sort((a, b) => compareDates(a.x, b.x));
        const sumWithPreviousBalances = sorted.map((cur, index) => {
          cur.value += index > 0 ? sorted[index - 1].value : 0;

          return cur;
        });

        return <BaseLineChart rows={sumWithPreviousBalances} />;
      }}
    />
  );
};

export default WealthGrowReport;
