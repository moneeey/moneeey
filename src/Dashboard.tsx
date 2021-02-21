import { Button } from "antd";
import React from "react";
import { compareDates } from "./Entity";
import { useMoneeeyStore } from "./MoneeeyStore";
import { MoneyGrowthReport } from "./Reports";
import {
  SampleCurrencies,
  SampleAccounts,
  SampleTransactions,
} from "./Samples";
import TransactionTable from "./TransactionTable";

export default function Dashboard() {
  const moneeeyStore = useMoneeeyStore();

  const addSamples = () => {
    if (moneeeyStore.currencies.all().length === 0) {
      SampleCurrencies.forEach((c) => moneeeyStore.currencies.add(c));
    }
    if (moneeeyStore.accounts.all().length === 0) {
      SampleAccounts.forEach((a) => moneeeyStore.accounts.add(a));
    }
    SampleTransactions.forEach((t) => moneeeyStore.transactions.add(t));
  };

  return (
    <div>
      <MoneyGrowthReport />
      <b>Recent Transactions</b>
      <TransactionTable
        transactions={moneeeyStore.transactions
          .all()
          .sort((a, b) => compareDates(a.updated || "", b.updated || ""))
          .splice(0, 5)}
      />
      <Button onClick={addSamples}>Add Samples</Button>
    </div>
  );
}
