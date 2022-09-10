import { observer } from 'mobx-react-lite'

import { TableEditor } from '../components/TableEditor'
import { AccountStore, TAccountUUID } from '../entities/Account'
import CurrencyStore from '../entities/Currency'
import TransactionStore, { ITransaction } from '../entities/Transaction'

interface TransactionSettingsProps {
  transactions: TransactionStore
  accounts: AccountStore
  currencies: CurrencyStore
  schemaFilter: (row: ITransaction) => boolean
  referenceAccount: TAccountUUID
}

const TransactionTable = observer(
  ({ transactions, schemaFilter }: TransactionSettingsProps) => (
    <TableEditor
      store={transactions}
      schemaFilter={schemaFilter}
      factory={transactions.factory}
    />
  )
)

export { TransactionTable, TransactionTable as default }
