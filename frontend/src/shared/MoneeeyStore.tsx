import AccountStore from '../entities/Account'
import BudgetStore from '../entities/Budget'
import ConfigStore from '../entities/Config'
import CurrencyStore from '../entities/Currency'
import TransactionStore from '../entities/Transaction'
import { EntityType } from './Entity'
import Importer from './import/Importer'
import ManagementStore from './Management'
import NavigationStore from './Navigation'
import PersistenceStore from './Persistence'
import TagsStore from './Tags'

export default class MoneeeyStore {
  tags = new TagsStore()
  navigation = new NavigationStore()
  accounts = new AccountStore(this)
  transactions = new TransactionStore(this)
  currencies = new CurrencyStore(this)
  budget = new BudgetStore(this)
  persistence = new PersistenceStore()
  management = new ManagementStore()
  importer = new Importer(this)
  config = new ConfigStore(this)

  constructor() {
    this.persistence.load().then(() => {
      this.persistence.monitor(this.accounts, EntityType.ACCOUNT)
      this.persistence.monitor(this.currencies, EntityType.CURRENCY)
      this.persistence.monitor(this.transactions, EntityType.TRANSACTION)
      this.persistence.monitor(this.budget, EntityType.BUDGET)
      this.persistence.monitor(this.config, EntityType.CONFIG)
      this.config.init()
    })
  }
}
