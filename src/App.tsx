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
import TransactionTable from "./TransactionTable";
import { Observe } from "./Observable";

const ReferenceAccountTransactions = ({
  moneeeyStore,
}: {
  moneeeyStore: MoneeeyStore;
}) => {
  const getTransactions = () => {
    if (moneeeyStore.navigation.area === NavigationArea.Home) {
      return moneeeyStore.transactions.viewAll();
    } else if (moneeeyStore.navigation.area === NavigationArea.Tag) {
      return moneeeyStore.transactions.viewAllWithTag(
        moneeeyStore.navigation.detail,
        moneeeyStore.accounts
      );
    } else {
      return [];
    }
  };
  return (
    <Observe subject={moneeeyStore.navigation}>
      {(_changedNavigation) => (
        <Observe subject={moneeeyStore.transactions}>
          {(_changedTransaction) => (
            <TransactionTable
              moneeeyStore={moneeeyStore}
              transactions={getTransactions()}
            />
          )}
        </Observe>
      )}
    </Observe>
  );
};

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

  return (
    <div className="App">
      <MoneeeyStoreProvider value={moneeeyStore}>
        <TagsHighlightProvider>
          <Observe subject={moneeeyStore.navigation}>
            {(_changedNav) => (
              <>
                <Button onClick={addSamples}>Add Samples</Button>
                <Button
                  onClick={() =>
                    moneeeyStore.navigation.navigate(NavigationArea.Home)
                  }
                >
                  Ref: {moneeeyStore.accounts.referenceAccountName}
                </Button>
                <ReferenceAccountTransactions moneeeyStore={moneeeyStore} />
              </>
            )}
          </Observe>
        </TagsHighlightProvider>
      </MoneeeyStoreProvider>
    </div>
  );
}

export default App;
