import AccountStore from '../entities/Account';
import CurrencyStore from '../entities/Currency';
import TransactionStore from '../entities/Transaction';
import { EntityType } from './Entity';
import ManagementStore from './Management';
import NavigationStore from './Navigation';
import PersistenceStore from './Persistence';
import TagsStore from './Tags';

export default class MoneeeyStore {
  tags = new TagsStore();
  navigation = new NavigationStore();
  accounts = new AccountStore(this.tags);
  transactions = new TransactionStore(this.tags);
  currencies = new CurrencyStore(this.tags);
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
