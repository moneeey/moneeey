import React, { type ReactNode } from "react";

import type MoneeeyStore from "./MoneeeyStore";

const MoneeeyContext = React.createContext({} as MoneeeyStore);

const useMoneeeyStore = (): MoneeeyStore => React.useContext(MoneeeyContext);

const MoneeeyStoreProvider = ({
	value,
	children,
}: { value: MoneeeyStore; children: ReactNode }) => (
	<MoneeeyContext.Provider value={value}>{children}</MoneeeyContext.Provider>
);

export { MoneeeyStoreProvider, useMoneeeyStore, useMoneeeyStore as default };
