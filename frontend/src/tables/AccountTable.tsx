import { observer } from 'mobx-react-lite';

import { TableEditor } from '../components/TableEditor';
import { AccountStore, AccountType, IAccount } from '../shared/Account';
import { CurrencyStore } from '../shared/Currency';

interface AccountSettingsProps {
  accounts: AccountStore;
  currencies: CurrencyStore;
  type: AccountType;
}

const AccountTable = observer(({ currencies, accounts, type }: AccountSettingsProps) => (
  <TableEditor store={accounts} schemaProps={{ currencies: currencies.all, type }} schemaFilter={(schema, row) => row.type === schema.type} />
))

export { AccountTable, AccountTable as default }