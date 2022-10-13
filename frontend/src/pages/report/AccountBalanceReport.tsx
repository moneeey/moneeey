import { observer } from 'mobx-react';

import { AccountKind, IAccount, TAccountUUID } from '../../entities/Account';
import { TDate } from '../../utils/Date';
import { TMonetary } from '../../shared/Entity';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { ITransaction } from '../../entities/Transaction';
import Messages from '../../utils/Messages';

import MoneeeyStore from '../../shared/MoneeeyStore';

import { PeriodGroup, ReportDataMap, dateToPeriod } from './ReportUtils';
import { BaseColumnChart, BaseReport } from './BaseReport';

export const baseAccountBalanceReport =
  (moneeeyStore: MoneeeyStore, fromIsPositive: boolean, filter: (account: IAccount) => boolean) =>
  (transaction: ITransaction, period: PeriodGroup, data: ReportDataMap) => {
    const addBalanceToData = (acct: TAccountUUID, value: TMonetary, date: TDate) => {
      const account = moneeeyStore.accounts.byUuid(acct);
      if (!account || !filter(account)) {
        return;
      }
      const group_date = dateToPeriod(period, date);
      const key = group_date + account.account_uuid;
      const prev_balance = (data.get(key) || {}).value || 0;
      const balance = prev_balance + value;
      data.set(key, { x: group_date, y: account.name, value: balance });
    };
    addBalanceToData(
      transaction.from_account,
      fromIsPositive ? transaction.from_value : -transaction.from_value,
      transaction.date
    );
    addBalanceToData(
      transaction.to_account,
      fromIsPositive ? -transaction.to_value : transaction.to_value,
      transaction.date
    );
  };

export const accountBalanceReport = (moneeeyStore: MoneeeyStore) =>
  baseAccountBalanceReport(moneeeyStore, false, (account) => account.kind !== AccountKind.PAYEE);

const AccountBalanceReport = observer(() => {
  const moneeeyStore = useMoneeeyStore();
  const { accounts } = moneeeyStore;

  return (
    <BaseReport
      accounts={accounts.allNonPayees}
      processFn={accountBalanceReport(moneeeyStore)}
      title={Messages.reports.account_balance}
      chartFn={(rows) => <BaseColumnChart rows={rows} />}
    />
  );
});

export default AccountBalanceReport;
