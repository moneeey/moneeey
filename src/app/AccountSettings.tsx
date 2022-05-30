import { observer } from 'mobx-react-lite';

import { EntityEditor } from '../components/EntityEditor';
import { AccountStore, AccountType, IAccount } from '../shared/Account';
import { CurrencyStore } from '../shared/Currency';

interface AccountSettingsProps {
  accounts: AccountStore;
  currencies: CurrencyStore;
  get: () => IAccount[];
  type: AccountType;
}

const AccountSettings = observer(({ currencies, accounts, get, type }: AccountSettingsProps) => (
  <EntityEditor entities={get()} store={accounts} schemaProps={{ currencies: currencies.all, type }} />
))

export { AccountSettings }