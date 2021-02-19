import React from "react";
import { AccountStore } from "./Account";
import { CurrencyStore } from "./Currency";
import NavigationStore from "./Navigation";
import { TransactionStore } from "./Transaction";

const MoneeeyContext = React.createContext({} as MoneeeyStore);

export default class MoneeeyStore {
  navigation: NavigationStore = new NavigationStore();
  accounts: AccountStore = new AccountStore();
  transactions: TransactionStore = new TransactionStore();
  currencies: CurrencyStore = new CurrencyStore();
}

export function useMoneeeyStore(): MoneeeyStore {
  return React.useContext(MoneeeyContext);
}

export function MoneeeyStoreProvider({ value, children }: any) {
  return (
    <MoneeeyContext.Provider value={value}>{children}</MoneeeyContext.Provider>
  );
}
