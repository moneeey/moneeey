import { action, makeObservable, observable } from "mobx";

import AccountStore from "../entities/Account";
import BudgetStore from "../entities/Budget";
import ConfigStore from "../entities/Config";
import CurrencyStore from "../entities/Currency";
import TransactionStore from "../entities/Transaction";

import EncryptionStore from "./EncryptionStore";
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

	encryption: EncryptionStore;

	persistence: PersistenceStore;

	management: ManagementStore;

	constructor(dbFactory: PouchDBFactoryFn) {
		makeObservable(this, {
			loaded: observable,
			load: action,
			setLoaded: action,
		});

		this.encryption = new EncryptionStore(this.logger);
		this.persistence = new PersistenceStore(dbFactory, this.logger);
		this.persistence.monitor(this.accounts);
		this.persistence.monitor(this.currencies);
		this.persistence.monitor(this.transactions);
		this.persistence.monitor(this.budget);
		this.persistence.monitor(this.config);
		this.management = new ManagementStore(this.persistence);
	}

	async load() {
		this.setLoaded(false);
		await this.persistence.load();
		this.config.init();
		this.currencies.addDefaults();
		// Drain the initial Config + currencies commit chain before revealing
		// the UI. See `PersistenceStore.flush` for why — without it, a fast
		// user click can submit an update based on a Config doc whose `_rev`
		// hasn't been refetched yet, which PouchDB rejects as a 409 and
		// silently rolls back.
		await this.persistence.flush();
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
