import { action, makeObservable, observable } from "mobx";

import AccountStore from "../entities/Account";
import BudgetStore from "../entities/Budget";
import ConfigStore from "../entities/Config";
import CurrencyStore from "../entities/Currency";
import TransactionStore from "../entities/Transaction";

import Logger from "./Logger";
import ManagementStore from "./Management";
import NavigationStore from "./Navigation";
import PersistenceStore, { type PouchDBFactoryFn } from "./Persistence";
import TagsStore from "./Tags";
import Importer from "./import/Importer";

export default class MoneeeyStore {
	loaded = false;

	logger = new Logger("moneeey");

	tags = new TagsStore(this.logger);

	navigation = new NavigationStore(this.logger);

	accounts = new AccountStore(this);

	transactions = new TransactionStore(this);

	currencies = new CurrencyStore(this);

	budget = new BudgetStore(this);

	importer = new Importer(this);

	config = new ConfigStore(this);

	persistence: PersistenceStore;

	management: ManagementStore;

	constructor(dbFactory: PouchDBFactoryFn) {
		makeObservable(this, {
			loaded: observable,
			load: action,
			setLoaded: action,
		});

		this.persistence = new PersistenceStore(dbFactory, this.logger);
		this.persistence.monitor(this.accounts);
		this.persistence.monitor(this.currencies);
		this.persistence.monitor(this.transactions);
		this.persistence.monitor(this.budget);
		this.persistence.monitor(this.config);
		this.management = new ManagementStore(this.persistence);

		// All stores are now wired into this — give them a chance to set up
		// cross-store reactions that couldn't run in their constructors.
		// Note: ConfigStore.init() has a separate, post-load meaning and is
		// intentionally not called here.
		this.accounts.onStoresReady();
		this.transactions.onStoresReady();
		this.currencies.onStoresReady();
		this.budget.onStoresReady();
		this.budget.envelopes.onStoresReady();
	}

	async load() {
		this.setLoaded(false);
		await this.persistence.load();
		this.config.init();
		this.currencies.addDefaults();
		const { couchSync } = this.config.main;
		if (couchSync?.enabled) {
			this.persistence.sync(couchSync);
		}
		this.setLoaded(true);
	}

	setLoaded(loaded: boolean) {
		this.loaded = loaded;
	}
}
