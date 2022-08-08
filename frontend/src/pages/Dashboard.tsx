import React from 'react';
import useMoneeeyStore from '../shared/useMoneeeyStore';
import { BalanceGrowthReport } from './Reports';
import TransactionTable from '../tables/TransactionTable';
import MoneeeyStore from '../shared/MoneeeyStore';
import { ITransaction } from '../shared/Transaction';
import { observer } from 'mobx-react';

const RecentTransactions = observer(({ moneeyStore: { transactions, accounts, currencies } }: { moneeyStore: MoneeeyStore }) => {
  const recent = new Set(transactions.sorted.splice(0, 5).map(t => t.transaction_uuid))
  const schemaFilter = (_sp: any, row: ITransaction) => recent.has(row.transaction_uuid)
  const referenceAccount = ''
  return <>
    <b>Recent Transactions</b>
    <TransactionTable {...{ transactions, accounts, currencies, schemaFilter, referenceAccount }} />;
  </>
})

export default function Dashboard() {
  const moneeeyStore = useMoneeeyStore();

  return (
    <div>
      <BalanceGrowthReport />
      <RecentTransactions moneeyStore={moneeeyStore} />
    </div>
  );
}
