import { observer } from 'mobx-react-lite';

import { LinkButton } from '../components/base/Button';
import Space, { VerticalSpace } from '../components/base/Space';
import TableEditor from '../components/TableEditor';
import { AccountKind, AccountStore, IAccount } from '../entities/Account';
import { CurrencyStore } from '../entities/Currency';
import NavigationStore, { NavigationModal } from '../shared/Navigation';
import Messages from '../utils/Messages';

interface AccountSettingsProps {
  accounts: AccountStore;
  currencies: CurrencyStore;
  navigation: NavigationStore;
  kind: AccountKind;
  schemaFilter: (row: IAccount) => boolean;
}

const AccountTable = observer(({ accounts, schemaFilter, kind, navigation }: AccountSettingsProps) => (
  <VerticalSpace>
    <Space>
      <LinkButton
        onClick={() => navigation.openModal(NavigationModal.MERGE_ACCOUNTS)}
        title={Messages.modal.merge_accounts}
      />
    </Space>
    <TableEditor<IAccount>
      data-test-id={`accountTable${kind}`}
      store={accounts}
      schemaFilter={schemaFilter}
      factory={(id?: string) => ({ ...accounts.factory(id), kind })}
    />
  </VerticalSpace>
));

export { AccountTable, AccountTable as default };
