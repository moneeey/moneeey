import { Select } from 'antd';
import _ from 'lodash';
import { observer } from 'mobx-react';

import { BaseSelectEditor } from './BaseSelectEditor';
import { CurrencyEditorProps } from './EditorProps';

export const CurrencyEditor = observer(<EntityType,>(props: CurrencyEditorProps<EntityType>) => {
  const editor = BaseSelectEditor({
    ...props,
    options: _(props.currencies)
      .map((currency) => ({ label: currency.name, value: currency.currency_uuid }))
      .value(),
    ComposedProps: {
      value: (props.entity as any)[props.field],
    },
    ComposedInput: Select
  });
  return editor.element;
});
