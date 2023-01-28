import { observer } from 'mobx-react';

import MoneeeyStore from '../../shared/MoneeeyStore';
import { AccountKind } from '../../entities/Account';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

import { BaseColumnChart, BaseReport } from './BaseReport';
import { baseAccountBalanceReport } from './AccountBalanceReport';

const payeeBalanceReport = (moneeeyStore: MoneeeyStore) =>
  baseAccountBalanceReport(moneeeyStore, true, (account) => account.kind === AccountKind.PAYEE);

const PayeeBalanceReport = observer(() => {
  const moneeeyStore = useMoneeeyStore();
  const { accounts } = moneeeyStore;

  return (
    <BaseReport
      accounts={accounts.allPayees}
      processFn={payeeBalanceReport(moneeeyStore)}
      title={Messages.reports.payee_balance}
      chartFn={(data, period) => <BaseColumnChart data={data} xFormatter={period.formatter} />}
    />
  );
});

export default PayeeBalanceReport;
