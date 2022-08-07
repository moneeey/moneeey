import { Select } from 'antd';
import _ from 'lodash';
import { observer } from 'mobx-react';
import { TCurrencyUUID, ICurrency } from '../../shared/Currency';

import { BaseSelectEditor } from './BaseSelectEditor';
import { EditorProps } from './EditorProps';

export interface CurrencyEditorProps<EntityType> extends EditorProps<EntityType, TCurrencyUUID, TCurrencyUUID> {
  currencies: ICurrency[];
}

export const CurrencyEditor = observer(<EntityType,>(props: CurrencyEditorProps<EntityType>) => {
  return (
    <BaseSelectEditor
      {...{
        ...props,
        value: props.store.byUuid(props.entityId)?.[props.field.field],
        options: _(props.currencies)
          .map((currency) => ({ label: currency.name, value: currency.currency_uuid }))
          .value(),
        ComposedProps: () => ({}),
        ComposedInput: Select
      }}
    />
  );
});
