import { observer } from 'mobx-react';

import useMoneeeyStore from '../shared/useMoneeeyStore';
import TransactionTable from '../tables/TransactionTable';
import MoneeeyStore from '../shared/MoneeeyStore';
import { ITransaction } from '../entities/Transaction';
import Messages from '../utils/Messages';

import AccountBalanceReport from './report/AccountBalanceReport';

const RecentTransactions = observer(
  ({ moneeyStore: { transactions, accounts, currencies } }: { moneeyStore: MoneeeyStore }) => {
    const recent = new Set(transactions.sorted.splice(0, 5).map((t) => t.transaction_uuid));
    const schemaFilter = (row: ITransaction) => recent.has(row.transaction_uuid);
    const referenceAccount = '';

    return (
      <div className='h-40'>
        <b>{Messages.dashboard.recent_transactions}</b>
        <TransactionTable
          {...{
            transactions,
            accounts,
            currencies,
            schemaFilter,
            referenceAccount,
          }}
          creatable={false}
        />
      </div>
    );
  }
);

export default function Dashboard() {
  const moneeeyStore = useMoneeeyStore();

  return (
    <div className='flex flex-col gap-4'>
      <RecentTransactions moneeyStore={moneeeyStore} />
      <AccountBalanceReport />
    </div>
  );
}
