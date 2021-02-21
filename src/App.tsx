import React from "react";
import "./App.css";
import "antd/dist/antd.css";
import MoneeeyStore, { MoneeeyStoreProvider } from "./MoneeeyStore";
import { TagsHighlightProvider } from "./Tags";
import { NavigationArea } from "./Navigation";
import { Observe } from "./Observable";
import AppMenu from "./AppMenu";
import AccountAndTagTransactions from "./AccountAndTagTransactions";
import Dashboard from "./Dashboard";

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());

  const renderAreaContent = (area: NavigationArea) => {
    switch (area) {
      case NavigationArea.Dashboard:
        return <Dashboard />;
      case NavigationArea.Reports:
        return <Reports />;
      case NavigationArea.Payees:
      case NavigationArea.Accounts:
      case NavigationArea.Currencies:
        return <span>Generic Editor for {area}</span>;
      case NavigationArea.AccountTransactions:
      case NavigationArea.TagTransactions:
        return (
          <>
            <AccountAndTagTransactions moneeeyStore={moneeeyStore} />
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
