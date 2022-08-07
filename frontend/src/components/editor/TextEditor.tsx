import { Input } from 'antd';
import { observer } from 'mobx-react';

import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

export interface TextEditorProps<EntityType> extends EditorProps<EntityType, string, string> {
}

export const TextEditor = observer(<EntityType,>(props: TextEditorProps<EntityType>) => {
  return (
    <BaseEditor
      {...{
        ...props,
        value: props.store.byUuid(props.entityId)?.[props.field.field],
        ComposedInput: Input,
        ComposedProps: (onChange) => ({
          onChange: ({ target: { value } }: any) => onChange(value)
        })
      }}
    />
  );
});
