import React from "react";
import "./App.css";
import "antd/dist/antd.css";
import MoneeeyStore, { MoneeeyStoreProvider } from "./MoneeeyStore";
import { TagsHighlightProvider } from "./Tags";
import { HomeRoute } from "./Routes";
import { RouteRenderer } from "./RouteBase";

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());

  return (
    <div className="App">
      <MoneeeyStoreProvider value={moneeeyStore}>
        <TagsHighlightProvider>
          <RouteRenderer route={HomeRoute} app={{ moneeeyStore }}/>
        </TagsHighlightProvider>
      </MoneeeyStoreProvider>
    </div>
  );
}

export default App;
