import { observer } from 'mobx-react-lite';

import TableEditor from '../components/TableEditor';
import { AccountKind, AccountStore, IAccount } from '../entities/Account';
import { CurrencyStore } from '../entities/Currency';

interface AccountSettingsProps {
  accounts: AccountStore;
  currencies: CurrencyStore;
  kind: AccountKind;
  schemaFilter: (row: IAccount) => boolean;
}

const AccountTable = observer(({ accounts, schemaFilter, kind }: AccountSettingsProps) => (
  <TableEditor
    data-test-id={`accountTable${kind}`}
    store={accounts}
    schemaFilter={schemaFilter}
    factory={(id?: string) => ({ ...accounts.factory(id), kind })}
  />
));

export { AccountTable, AccountTable as default };
