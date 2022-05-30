import { observer } from 'mobx-react-lite';

import { EntityEditor } from '../components/EntityEditor';
import { CurrencyStore } from '../shared/Currency';

interface CurrencySettingsProps {
  currencies: CurrencyStore;
}

const CurrencySettings = observer(({ currencies }: CurrencySettingsProps) => (
  <EntityEditor entities={currencies.all} store={currencies} schemaProps={{}} />
));

export { CurrencySettings }