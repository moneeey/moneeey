import { observer } from 'mobx-react-lite';

import { TableEditor } from '../components/TableEditor';
import { CurrencyStore } from '../entities/Currency';

interface CurrencySettingsProps {
  currencies: CurrencyStore;
}

const CurrencyTable = observer(({ currencies }: CurrencySettingsProps) => (
  <TableEditor store={currencies} factory={currencies.factory} />
));

export { CurrencyTable, CurrencyTable as default };
