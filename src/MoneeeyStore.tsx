import React from "react";
import { AccountStore } from "./Account";
import { CurrencyStore } from "./Currency";
import NavigationStore from "./Navigation";

const MoneeeyContext = React.createContext({} as MoneeeyStore);

export default class MoneeeyStore {
  navigation: NavigationStore = new NavigationStore();
  accounts: AccountStore = new AccountStore();
  currencies: CurrencyStore = new CurrencyStore();
}

export function useStore(): MoneeeyStore {
  return React.useContext(MoneeeyContext);
}

export function MoneeeyProvider({ value, children }: any) {
  return (
    <MoneeeyContext.Provider value={value}>{children}</MoneeeyContext.Provider>
  );
}
