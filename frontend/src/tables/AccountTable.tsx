import { observer } from 'mobx-react-lite';

import { TableEditor } from '../components/TableEditor';
import { AccountKind, AccountStore, IAccount } from '../entities/Account';
import { CurrencyStore } from '../entities/Currency';

interface AccountSettingsProps {
  accounts: AccountStore;
  currencies: CurrencyStore;
  kind: AccountKind;
}

const AccountTable = observer(({ accounts, kind }: AccountSettingsProps) => (
  <TableEditor
    store={accounts}
    schemaFilter={(row: IAccount) => row.kind === kind}
    factory={(id?: string) => ({ ...accounts.factory(id), kind })}
  />
));

export { AccountTable, AccountTable as default };
