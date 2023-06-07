import { observer } from 'mobx-react-lite';

import CurrencySelectorField from '../components/editor/CurrencySelectorField';
import TextField from '../components/editor/TextField';
import FormEditor from '../components/FormEditor';
import ConfigStore, { IConfig } from '../entities/Config';
import Messages from '../utils/Messages';

const ConfigTable = observer(({ config }: { config: ConfigStore }) => {
  return (
    <FormEditor
      data-test-id='configTable'
      store={config}
      entity={config.main}
      schema={[
        {
          title: Messages.util.date_format,
          width: 100,
          validate: ({ date_format }) => ({ valid: date_format.length > 0, error: 'Invalid date format' }),
          ...TextField<IConfig>({
            read: ({ date_format }) => date_format,
            delta: (date_format) => ({ date_format }),
          }),
        },
        {
          title: Messages.settings.decimal_separator,
          width: 100,
          validate: ({ decimal_separator }) => ({
            valid: decimal_separator.length > 0,
            error: 'Invalid decimal separator',
          }),
          ...TextField<IConfig>({
            read: ({ decimal_separator }) => decimal_separator,
            delta: (decimal_separator) => ({ decimal_separator }),
          }),
        },
        {
          title: Messages.settings.thousand_separator,
          width: 100,
          validate: ({ thousand_separator }) => ({
            valid: thousand_separator.length > 0,
            error: 'Invalid thousand separator',
          }),
          ...TextField<IConfig>({
            read: ({ thousand_separator }) => thousand_separator,
            delta: (thousand_separator) => ({ thousand_separator }),
          }),
        },
        {
          title: Messages.settings.default_currency,
          width: 100,
          validate: ({ default_currency }) => ({
            valid: default_currency.length > 0,
            error: 'Invalid default currency',
          }),
          ...CurrencySelectorField<IConfig>({
            read: ({ default_currency }) => default_currency,
            delta: (default_currency) => ({ default_currency }),
          }),
        },
      ]}
    />
  );
});

export { ConfigTable, ConfigTable as default };
