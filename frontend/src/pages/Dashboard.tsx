import React from 'react';
import useMoneeeyStore from './useMoneeeyStore';
import { BalanceGrowthReport } from './Reports';
import TransactionTable from '../tables/TransactionTable';

export default function Dashboard() {
  const moneeeyStore = useMoneeeyStore();

  return (
    <div>
      <BalanceGrowthReport />
      <b>Recent Transactions</b>
      <TransactionTable referenceAccount={''} transactions={moneeeyStore.transactions.sorted.splice(0, 5)} />
    </div>
  );
}
