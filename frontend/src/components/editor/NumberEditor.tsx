import { InputNumber } from 'antd';
import { observer } from 'mobx-react';

import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

export interface NumberEditorProps<EntityType> extends EditorProps<EntityType, number, number> {
}

export const NumberEditor = observer(<EntityType,>(props: NumberEditorProps<EntityType>) => {
  return (
    <BaseEditor
      {...{
        ...props,
        value: props.store.byUuid(props.entityId)?.[props.field.field],
        ComposedInput: InputNumber,
        ComposedProps: (onChange) => ({
          onChange: (value: number | null) => onChange(value)
        })
      }}
    />
  );
});
