import { observer } from 'mobx-react-lite';

import NumberField from '../components/editor/NumberField';
import TagField from '../components/editor/TagField';
import TextField from '../components/editor/TextField';
import TableEditor from '../components/TableEditor';
import { CurrencyStore, ICurrency } from '../entities/Currency';
import useMoneeeyStore from '../shared/useMoneeeyStore';
import Messages from '../utils/Messages';

interface CurrencySettingsProps {
  currencies: CurrencyStore;
}

const CurrencyTable = observer(({ currencies }: CurrencySettingsProps) => {
  const { config } = useMoneeeyStore();

  return (
    <TableEditor
      data-test-id='currencyTable'
      store={currencies}
      factory={currencies.factory}
      schema={[
        {
          title: Messages.util.name,
          width: 200,
          validate: ({ name }) => ({ valid: name.length > 2, error: 'Invalid name' }),
          ...TextField<ICurrency>({
            read: ({ name }) => name,
            delta: (name) => ({ name }),
          }),
        },
        {
          title: Messages.currencies.short,
          width: 100,
          validate: () => ({ valid: true }),
          ...TextField<ICurrency>({
            read: ({ short }) => short,
            delta: (short) => ({ short }),
          }),
        },
        {
          title: Messages.currencies.prefix,
          width: 100,
          validate: () => ({ valid: true }),
          ...TextField<ICurrency>({
            read: ({ prefix }) => prefix,
            delta: (prefix) => ({ prefix }),
          }),
        },
        {
          title: Messages.currencies.suffix,
          width: 100,
          validate: () => ({ valid: true }),
          ...TextField<ICurrency>({
            read: ({ suffix }) => suffix,
            delta: (suffix) => ({ suffix }),
          }),
        },
        {
          title: Messages.currencies.decimals,
          width: 100,
          validate: () => ({ valid: true }),
          ...NumberField<ICurrency>({
            read: ({ decimals }) => decimals,
            delta: (decimals) => ({ decimals }),
            thousandSeparator: config.main.thousand_separator,
            decimalSeparator: config.main.decimal_separator,
            decimalScale: 2,
          }),
        },
        {
          title: Messages.util.tags,
          width: 100,
          validate: () => ({ valid: true }),
          ...TagField<ICurrency>({
            read: ({ tags }) => tags,
            delta: (tags) => ({ tags }),
          }),
        },
      ]}
    />
  );
});

export { CurrencyTable, CurrencyTable as default };
