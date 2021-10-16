import React from "react";
import "./App.css";
import "antd/dist/antd.css";
import MoneeeyStore, { } from "./shared/MoneeeyStore";
import { MoneeeyStoreProvider } from "./app/useMoneeeyStore";
import { TagsHighlightProvider } from "./app/Tags";
import { HomeRoute } from "./Routes";
import RouteRenderer from "./app/RouteRenderer";
import AppMenu from "./app/AppMenu";

function Moneeey({ moneeeyStore }: { moneeeyStore: MoneeeyStore }) {
  return (
    <MoneeeyStoreProvider value={moneeeyStore}>
      <TagsHighlightProvider>
        <RouteRenderer route={HomeRoute} app={{ moneeeyStore }} menu={<AppMenu />}/>
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
