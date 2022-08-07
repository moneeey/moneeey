import { observer } from 'mobx-react-lite';

import { EntityEditor } from '../components/editor/EntityEditor';
import { AccountStore, AccountType, IAccount } from '../shared/Account';
import { CurrencyStore } from '../shared/Currency';

interface AccountSettingsProps {
  accounts: AccountStore;
  currencies: CurrencyStore;
  entities: IAccount[];
  type: AccountType;
}

const AccountSettings = observer(({ currencies, accounts, entities, type }: AccountSettingsProps) => (
  <EntityEditor entities={entities} store={accounts} schemaProps={{ currencies: currencies.all, type }} />
))

export { AccountSettings }