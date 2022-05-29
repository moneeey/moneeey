import { observer } from 'mobx-react-lite';

import { CurrencyEditor, DateEditor, EntityEditor, TextEditor } from '../components/EntityEditor';
import { IAccount } from '../shared/Account';
import { ICurrency } from '../shared/Currency';

interface AccountSettingsProps {
  accounts: IAccount[];
  currencies: ICurrency[];
}

const AccountSettings = observer(({ accounts, currencies }: AccountSettingsProps) => (
  <EntityEditor entities={accounts}>
    <TextEditor title="Name" field="name" required validate={value => {
      if (value.length < 2) return { valid: false, error: 'Please type a name'}
      return { valid: true }
    }}/>
    <CurrencyEditor title="Currency" field="currency_uuid" required currencies={currencies}/>
    <DateEditor title="Created" field="created"/>
  </EntityEditor>
))

export { AccountSettings }