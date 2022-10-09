import { observer } from 'mobx-react-lite';

import { TableEditor } from '../components/TableEditor';
import { AccountStore, AccountType, IAccount } from '../entities/Account';
import { CurrencyStore } from '../entities/Currency';

interface AccountSettingsProps {
  accounts: AccountStore;
  currencies: CurrencyStore;
  type: AccountType;
}

const AccountTable = observer(({ accounts, type }: AccountSettingsProps) => (
  <TableEditor
    store={accounts}
    schemaFilter={(row: IAccount) => row.type === type}
    factory={(id?: string) => ({ ...accounts.factory(id), type })}
  />
));

export { AccountTable, AccountTable as default };
