import { observer } from 'mobx-react';

import MoneeeyStore from '../../shared/MoneeeyStore';
import { AccountType } from '../../entities/Account';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

import { BaseColumnChart, BaseReport } from './BaseReport';
import { baseAccountBalanceReport } from './AccountBalanceReport';

const payeeBalanceReport = (moneeeyStore: MoneeeyStore) =>
  baseAccountBalanceReport(moneeeyStore, true, (account) => account.type === AccountType.PAYEE);

const PayeeBalanceReport = observer(() => {
  const moneeeyStore = useMoneeeyStore();
  const { accounts } = moneeeyStore;

  return (
    <BaseReport
      accounts={accounts.allPayees}
      processFn={payeeBalanceReport(moneeeyStore)}
      title={Messages.reports.payee_balance}
      chartFn={(rows) => <BaseColumnChart rows={rows} />}
    />
  );
});

export default PayeeBalanceReport;
