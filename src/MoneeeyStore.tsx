import React from "react";
import { AccountStore } from "./Account";
import { CurrencyStore } from "./Currency";
import { EntityType } from "./Entity";
import NavigationStore from "./Navigation";
import PersistenceStore from "./Persistence";
import { TransactionStore } from "./Transaction";

const MoneeeyContext = React.createContext({} as MoneeeyStore);

export default class MoneeeyStore {
  navigation = new NavigationStore();
  accounts = new AccountStore();
  transactions = new TransactionStore();
  currencies = new CurrencyStore();
  persistence = new PersistenceStore();

  constructor() {
    this.persistence.load().then(() => {
      const loadAndMonitor = (store: any, typee: EntityType) => {
        this.persistence.retrieve(typee).forEach((e) => store.add(e));
        this.persistence.monitorChanges(store);
      };
      loadAndMonitor(this.accounts, EntityType.ACCOUNT);
      loadAndMonitor(this.currencies, EntityType.CURRENCY);
      loadAndMonitor(this.transactions, EntityType.TRANSACTION);
    });
  }
}

export function useMoneeeyStore(): MoneeeyStore {
  return React.useContext(MoneeeyContext);
}

export function MoneeeyStoreProvider({ value, children }: any) {
  return (
    <MoneeeyContext.Provider value={value}>{children}</MoneeeyContext.Provider>
  );
}
