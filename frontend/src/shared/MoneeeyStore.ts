import { action, makeObservable, observable } from 'mobx';

import AccountStore from '../entities/Account';
import BudgetStore from '../entities/Budget';
import ConfigStore from '../entities/Config';
import CurrencyStore from '../entities/Currency';
import TransactionStore from '../entities/Transaction';

import { EntityType } from './Entity';
import Importer from './import/Importer';
import Logger from './Logger';
import ManagementStore from './Management';
import NavigationStore from './Navigation';
import PersistenceStore, { PouchDBFactoryFn } from './Persistence';
import TagsStore from './Tags';

export default class MoneeeyStore {
  loaded = false;

  logger = new Logger('moneeey');

  tags = new TagsStore(this.logger);

  navigation = new NavigationStore(this.logger);

  accounts = new AccountStore(this);

  transactions = new TransactionStore(this);

  currencies = new CurrencyStore(this);

  budget = new BudgetStore(this);

  importer = new Importer(this);

  config = new ConfigStore(this);

  persistence: PersistenceStore;

  management: ManagementStore

  constructor(dbFactory: PouchDBFactoryFn) {
    makeObservable(this, { loaded: observable, load: action, setLoaded: action });

    this.persistence = new PersistenceStore(dbFactory, this.logger);
    this.persistence.monitor(this.accounts, EntityType.ACCOUNT);
    this.persistence.monitor(this.currencies, EntityType.CURRENCY);
    this.persistence.monitor(this.transactions, EntityType.TRANSACTION);
    this.persistence.monitor(this.budget, EntityType.BUDGET);
    this.persistence.monitor(this.config, EntityType.CONFIG);
    this.management = new ManagementStore(this.persistence)
  }

  async load() {
    this.setLoaded(false);
    await this.persistence.load();
    this.config.init();
    this.currencies.addDefaults();
    const { couchSync } = this.config.main;
    if (couchSync && couchSync.enabled) {
      this.persistence.sync(couchSync);
    }
    this.setLoaded(true);
  }

  setLoaded(loaded: boolean) {
    this.loaded = loaded;
  }
}
