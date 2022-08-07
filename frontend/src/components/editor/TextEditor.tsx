import { Input } from 'antd';
import { observer } from 'mobx-react';

import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

export interface TextEditorProps<EntityType> extends EditorProps<EntityType, string, string> {
}

export const TextEditor = observer(<EntityType,>(props: TextEditorProps<EntityType>) => {
  const entity = props.store.byUuid(props.entityId)
  return (
    <BaseEditor
      {...{
        ...props,
        value: entity?.[props.field.field],
        rev: entity?._rev,
        ComposedInput: Input,
        ComposedProps: (onChange) => ({
          onChange: ({ target: { value } }: any) => onChange(value)
        })
      }}
    />
  );
});
