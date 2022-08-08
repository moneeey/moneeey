import { InputNumber } from 'antd';
import { observer } from 'mobx-react';

import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

export const NumberEditor = observer(<EntityType,>(props: EditorProps<EntityType, number, number>) => {
  const entity = props.store.byUuid(props.entityId)
  return (
    <BaseEditor
      {...{
        ...props,
        value: entity?.[props.field.field],
        rev: entity?._rev,
        ComposedInput: InputNumber,
        ComposedProps: (onChange) => ({
          onChange: (value: number | null) => onChange(value)
        })
      }}
    />
  );
});
