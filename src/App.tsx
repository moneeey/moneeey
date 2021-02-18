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
import Ledger from "./Ledger";
import { ITransaction } from "./Transaction";

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());
  const [navigating, setNavigating] = React.useState(
    moneeeyStore.navigation.full_path
  );
  const [transactions, setTransactions] = React.useState([] as ITransaction[]);
  React.useEffect(() => {
    const { navigation, currencies, accounts } = moneeeyStore;
    navigation.addObserver((navigation: NavigationStore) => {
      setNavigating(navigation.full_path);
    });
    SampleCurrencies.forEach((c) => currencies.add(c));
    SampleAccounts.forEach((a) => accounts.add(a));
    setTransactions(SampleTransactions);
  }, [moneeeyStore]);
  React.useEffect(() => {
    const { navigation } = moneeeyStore;
    if (navigation.area === NavigationArea.Home) {
      setTransactions(SampleTransactions);
    } else if (navigation.area === NavigationArea.Tag) {
      setTransactions(
        SampleTransactions.filter((row) => {
          const from_acct = moneeeyStore.accounts.findByUuid(row.from_account);
          const to_acct = moneeeyStore.accounts.findByUuid(row.to_account);
          const all_tags = [...from_acct.tags, ...to_acct.tags, ...row.tags];
          return all_tags.indexOf(navigation.detail) >= 0;
        })
      );
    }
  }, [navigating, moneeeyStore]);
  return (
    <div className="App">
      <MoneeeyStoreProvider value={moneeeyStore}>
        <TagsHighlightProvider>
          <Button
            onClick={() =>
              moneeeyStore.navigation.navigate(NavigationArea.Home)
            }
          >
            Home
          </Button>{" "}
          {navigating}
          <Ledger moneeeyStore={moneeeyStore} transactions={transactions} />
        </TagsHighlightProvider>
      </MoneeeyStoreProvider>
    </div>
  );
}

export default App;
