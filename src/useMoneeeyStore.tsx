import React from 'react';
import MoneeeyStore from './shared/MoneeeyStore';

const MoneeeyContext = React.createContext({} as MoneeeyStore);

export default function useMoneeeyStore(): MoneeeyStore {
  return React.useContext(MoneeeyContext);
}

export function MoneeeyStoreProvider({ value, children }: { value: MoneeeyStore; children: any }) {
  return <MoneeeyContext.Provider value={value}>{children}</MoneeeyContext.Provider>;
}
