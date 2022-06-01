import { Input } from 'antd';
import { observer } from 'mobx-react';

import { BaseEditor } from './BaseEditor';
import { TextEditorProps } from './EditorProps';

export const TextEditor = observer(<EntityType,>(props: TextEditorProps<EntityType>) => {
  const editor = BaseEditor({
    ...props,
    ComposedInput: Input,
    ComposedProps: {
      value: (props.entity as any)[props.field],
      onChange: ({ target: { value } }: any) => editor.onChange(value)
    }
  });
  return editor.element;
});
