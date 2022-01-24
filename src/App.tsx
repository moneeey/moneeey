import React from "react";
import "./App.css";
import "antd/dist/antd.css";
import MoneeeyStore, { } from "./shared/MoneeeyStore";
import { MoneeeyStoreProvider } from "./useMoneeeyStore";
import { TagsHighlightProvider } from "./app/Tags";
import RouteRenderer from "./app/RouteRenderer";
import AppMenu from "./app/AppMenu";
import { HomeRoute } from "./Routes";

function Moneeey({ moneeeyStore }: { moneeeyStore: MoneeeyStore }) {
  return (
    <MoneeeyStoreProvider value={moneeeyStore}>
      <TagsHighlightProvider>
        <AppMenu />
+        <RouteRenderer route={HomeRoute} app={{ moneeeyStore }} />
      </TagsHighlightProvider>
    </MoneeeyStoreProvider>
  )
}

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());

  return (
    <div className="App">
      <Moneeey {...{moneeeyStore}} />
    </div>
  );
}

export default App;
