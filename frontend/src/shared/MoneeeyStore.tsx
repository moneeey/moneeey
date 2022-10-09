import { makeObservable, observable } from 'mobx'

import AccountStore from '../entities/Account'
import BudgetStore from '../entities/Budget'
import ConfigStore from '../entities/Config'
import CurrencyStore from '../entities/Currency'
import TransactionStore from '../entities/Transaction'

import { EntityType } from './Entity'
import Importer from './import/Importer'
import ManagementStore from './Management'
import NavigationStore from './Navigation'
import PersistenceStore, { PouchDBFactoryFn } from './Persistence'
import TagsStore from './Tags'

export default class MoneeeyStore {
  loaded = false

  tags = new TagsStore()

  navigation = new NavigationStore()

  accounts = new AccountStore(this)

  transactions = new TransactionStore(this)

  currencies = new CurrencyStore(this)

  budget = new BudgetStore(this)

  management = new ManagementStore()

  importer = new Importer(this)

  config = new ConfigStore(this)

  persistence: PersistenceStore

  constructor(dbFactory: PouchDBFactoryFn) {
    makeObservable(this, { loaded: observable })

    this.persistence = new PersistenceStore(this, dbFactory)

    this.persistence.load().then(() => {
      this.persistence.monitor(this.accounts, EntityType.ACCOUNT)
      this.persistence.monitor(this.currencies, EntityType.CURRENCY)
      this.persistence.monitor(this.transactions, EntityType.TRANSACTION)
      this.persistence.monitor(this.budget, EntityType.BUDGET)
      this.persistence.monitor(this.config, EntityType.CONFIG)
      setTimeout(() => {
        this.config.init()
        this.currencies.addDefaults()
      }, 1000)
      this.loaded = true
      this.persistence.sync()
    })
  }
}
