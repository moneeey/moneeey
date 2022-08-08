import { observer } from 'mobx-react-lite';

import { TableEditor } from '../components/TableEditor';
import { AccountStore, AccountType, IAccount } from '../entities/Account';
import { CurrencyStore } from '../entities/Currency';

interface AccountSettingsProps {
  accounts: AccountStore;
  currencies: CurrencyStore;
  type: AccountType;
}

const AccountTable = observer(({ currencies, accounts, type }: AccountSettingsProps) => (
  <TableEditor store={accounts} schemaProps={{ currencies: currencies.all, type }} schemaFilter={(schema, row) => row.type === schema.type} />
))

export { AccountTable, AccountTable as default }