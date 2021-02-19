import React from "react";
import "./App.css";
import "antd/dist/antd.css";
import { Button } from "antd";
import MoneeeyStore, { MoneeeyStoreProvider } from "./MoneeeyStore";
import {
  SampleAccounts,
  SampleCurrencies,
  SampleTransactions,
} from "./Samples";
import { TagsHighlightProvider } from "./Tags";
import NavigationStore, { NavigationArea } from "./Navigation";
import TransactionTable from "./TransactionTable";
import { ITransaction } from "./Transaction";

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());
  const [transactions, setTransactions] = React.useState([] as ITransaction[]);
  const [navigating, setNavigating] = React.useState(
    moneeeyStore.navigation.full_path
  );
  const [initialLoad, setInitialLoad] = React.useState(false);
  React.useEffect(() => {
    const { navigation, accounts, transactions } = moneeeyStore;
    if (navigation.area === NavigationArea.Home) {
      setTransactions(transactions.viewAll());
    } else if (navigation.area === NavigationArea.Tag) {
      setTransactions(transactions.viewAllWithTag(navigation.detail, accounts));
    }
  }, [moneeeyStore, navigating]);

  React.useEffect(() => {
    if (initialLoad) return;
    const { navigation, currencies, accounts, transactions } = moneeeyStore;
    navigation.addObserver((navigation: NavigationStore) => {
      setNavigating(navigation.full_path);
    });
    transactions.addObserver(() => {
      setNavigating(navigation.full_path + " ");
    });
    SampleCurrencies.forEach((c) => currencies.add(c));
    SampleAccounts.forEach((a) => accounts.add(a));
    SampleTransactions.forEach((t) => transactions.add(t));
    setInitialLoad(true);
  }, [moneeeyStore, initialLoad]);

  return (
    <div className="App">
      <MoneeeyStoreProvider value={moneeeyStore}>
        <TagsHighlightProvider>
          <Button
            onClick={() =>
              moneeeyStore.navigation.navigate(NavigationArea.Home)
            }
          >
            {moneeeyStore.accounts.referenceAccountName + " || " + navigating}
          </Button>

          <TransactionTable
            moneeeyStore={moneeeyStore}
            transactions={transactions}
          />
        </TagsHighlightProvider>
      </MoneeeyStoreProvider>
    </div>
  );
}

export default App;
