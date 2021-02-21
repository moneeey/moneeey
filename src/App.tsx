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
import { NavigationArea } from "./Navigation";
import { Observe } from "./Observable";
import AppMenu from "./AppMenu";
import AccountAndTagTransactions from "./AccountAndTagTransactions";

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());

  const addSamples = () => {
    if (moneeeyStore.currencies.all().length === 0) {
      SampleCurrencies.forEach((c) => moneeeyStore.currencies.add(c));
    }
    if (moneeeyStore.accounts.all().length === 0) {
      SampleAccounts.forEach((a) => moneeeyStore.accounts.add(a));
    }
    SampleTransactions.forEach((t) => moneeeyStore.transactions.add(t));
  };

  const renderAreaContent = (area: NavigationArea) => {
    switch (area) {
      case NavigationArea.Dashboard:
        return <span>Choose an account in Transactions</span>;
      case NavigationArea.Reports:
        return <span>Something amazing will be here</span>;
      case NavigationArea.Payees:
      case NavigationArea.Accounts:
      case NavigationArea.Currencies:
        return <span>Generic Editor for {area}</span>;
      case NavigationArea.AccountTransactions:
      case NavigationArea.TagTransactions:
        return (
          <>
            <AccountAndTagTransactions moneeeyStore={moneeeyStore} />
            <Button onClick={addSamples}>Add Samples</Button>
          </>
        );
    }
  };

  return (
    <div className="App">
      <MoneeeyStoreProvider value={moneeeyStore}>
        <TagsHighlightProvider>
          <Observe subject={moneeeyStore.navigation}>
            {(_changedNav) => (
              <>
                <Observe subject={moneeeyStore.accounts}>
                  {(_changedAcct) => <AppMenu moneeeyStore={moneeeyStore} />}
                </Observe>
                {renderAreaContent(moneeeyStore.navigation.area)}
              </>
            )}
          </Observe>
        </TagsHighlightProvider>
      </MoneeeyStoreProvider>
    </div>
  );
}

export default App;
