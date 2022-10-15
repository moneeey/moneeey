import { observer } from 'mobx-react-lite';

import { TableEditor } from '../components/TableEditor';
import { AccountKind, AccountStore, IAccount } from '../entities/Account';
import { CurrencyStore } from '../entities/Currency';

interface AccountSettingsProps {
  accounts: AccountStore;
  currencies: CurrencyStore;
  type: AccountKind;
}

const AccountTable = observer(({ accounts, type }: AccountSettingsProps) => (
  <TableEditor
    store={accounts}
    schemaFilter={(row: IAccount) => row.kind === type}
    factory={(id?: string) => ({ ...accounts.factory(id), type })}
  />
));

export { AccountTable, AccountTable as default };
