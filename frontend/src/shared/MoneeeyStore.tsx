import { AccountStore } from './Account';
import { CurrencyStore } from './Currency';
import { EntityType } from './Entity';
import ManagementStore from './Management';
import NavigationStore from './Navigation';
import PersistenceStore from './Persistence';
import { TransactionStore } from './Transaction';

export default class MoneeeyStore {
  navigation = new NavigationStore();
  accounts = new AccountStore();
  transactions = new TransactionStore();
  currencies = new CurrencyStore();
  persistence = new PersistenceStore();
  management = new ManagementStore();

  constructor() {
    this.persistence.load().then(() => {
      this.persistence.monitor(this.accounts, EntityType.ACCOUNT);
      this.persistence.monitor(this.currencies, EntityType.CURRENCY);
      this.persistence.monitor(this.transactions, EntityType.TRANSACTION);
    });
  }
}
