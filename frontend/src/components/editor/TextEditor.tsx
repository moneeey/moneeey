import { Input } from 'antd';
import { observer } from 'mobx-react';

import { BaseEditor } from './BaseEditor';
import { TextEditorProps } from './EditorProps';

export const TextEditor = observer(<EntityType,>(props: TextEditorProps<EntityType>) => {
  return (
    <BaseEditor
      {...{
        ...props,
        value: props.store.byUuid(props.entityId)?.[props.field],
        ComposedInput: Input,
        ComposedProps: (onChange) => ({
          onChange: ({ target: { value } }: any) => onChange(value)
        })
      }}
    />
  );
});
