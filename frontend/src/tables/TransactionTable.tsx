import { observer } from 'mobx-react-lite';

import { TableEditor } from '../components/TableEditor';
import { AccountStore, TAccountUUID } from '../shared/Account';
import { CurrencyStore } from '../shared/Currency';
import { ITransaction, TransactionStore } from '../shared/Transaction';

interface TransactionSettingsProps {
  transactions: TransactionStore;
  accounts: AccountStore;
  currencies: CurrencyStore;
  schemaFilter: (schema: any, row: ITransaction) => boolean;
  referenceAccount: TAccountUUID;
}

const TransactionTable = observer(({ transactions, currencies, accounts, schemaFilter, referenceAccount }: TransactionSettingsProps) => (
  <TableEditor store={transactions} schemaProps={{ currencies: currencies.all, accounts: accounts.all, referenceAccount }} schemaFilter={schemaFilter} />
))

export { TransactionTable, TransactionTable as default }