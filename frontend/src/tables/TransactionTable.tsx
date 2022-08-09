import { observer } from 'mobx-react-lite'

import { TableEditor } from '../components/TableEditor'
import { AccountStore, TAccountUUID } from '../entities/Account'
import CurrencyStore from '../entities/Currency'
import TransactionStore, { ITransaction } from '../entities/Transaction'

interface TransactionSettingsProps {
  transactions: TransactionStore;
  accounts: AccountStore;
  currencies: CurrencyStore;
  schemaFilter: (schema: unknown, row: ITransaction) => boolean;
  referenceAccount: TAccountUUID;
}

const TransactionTable = observer(({ transactions, currencies, accounts, schemaFilter, referenceAccount, ...rest }: TransactionSettingsProps) => (
  <TableEditor store={transactions} schemaProps={{ currencies: currencies.all, accounts: accounts.all, referenceAccount, ...rest }} schemaFilter={schemaFilter} />
))

export { TransactionTable, TransactionTable as default }