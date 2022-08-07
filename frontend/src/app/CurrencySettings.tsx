import { observer } from 'mobx-react-lite';

import { TableEditor } from '../components/editor/TableEditor';
import { CurrencyStore } from '../shared/Currency';

interface CurrencySettingsProps {
  currencies: CurrencyStore;
}

const CurrencySettings = observer(({ currencies }: CurrencySettingsProps) => (
  <TableEditor store={currencies} schemaProps={{}} />
));

export { CurrencySettings }