import { AccountStore } from "./Account";
import { CurrencyStore } from "./Currency";
import { EntityType } from "./Entity";
import NavigationStore from "./Navigation";
import PersistenceStore from "./Persistence";
import { TransactionStore } from "./Transaction";
import ManagementStore from "./Management";

export default class MoneeeyStore {
  navigation = new NavigationStore();
  accounts = new AccountStore();
  transactions = new TransactionStore();
  currencies = new CurrencyStore();
  persistence = new PersistenceStore();
  management = new ManagementStore();

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
