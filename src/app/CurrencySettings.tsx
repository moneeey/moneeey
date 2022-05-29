import { observer } from 'mobx-react-lite';

import { DateEditor, EntityEditor, NumberEditor, TextEditor } from '../components/EntityEditor';
import { ICurrency } from '../shared/Currency';

interface CurrencySettingsProps {
  currencies: ICurrency[];
}

const CurrencySettings = observer(({ currencies }: CurrencySettingsProps) => (
  <EntityEditor entities={currencies}>
    <TextEditor title="Name" field="name"/>
    <TextEditor title="Short name" field="short"/>
    <TextEditor title="Suffix" field="suffix"/>
    <TextEditor title="Prefix" field="prefix"/>
    <NumberEditor title="Decimals" field="decimals"/>
    <DateEditor title="Created" field="created"/>
  </EntityEditor>
))

export { CurrencySettings }