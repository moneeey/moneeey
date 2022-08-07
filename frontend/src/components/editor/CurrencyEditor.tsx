import { Select } from 'antd';
import _ from 'lodash';
import { observer } from 'mobx-react';

import { BaseSelectEditor } from './BaseSelectEditor';
import { CurrencyEditorProps } from './EditorProps';

export const CurrencyEditor = observer(<EntityType,>(props: CurrencyEditorProps<EntityType>) => {
  return (
    <BaseSelectEditor
      {...{
        ...props,
        value: props.store.byUuid(props.entityId)?.[props.field],
        options: _(props.currencies)
          .map((currency) => ({ label: currency.name, value: currency.currency_uuid }))
          .value(),
        ComposedProps: () => ({}),
        ComposedInput: Select
      }}
    />
  );
});
