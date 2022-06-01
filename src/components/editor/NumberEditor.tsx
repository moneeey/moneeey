import { InputNumber } from 'antd';
import { observer } from 'mobx-react';

import { BaseEditor } from './BaseEditor';
import { NumberEditorProps } from './EditorProps';

export const NumberEditor = observer(<EntityType,>(props: NumberEditorProps<EntityType>) => {
  const editor = BaseEditor({
    ...props,
    ComposedInput: InputNumber,
    ComposedProps: {
      value: (props.entity as any)[props.field],
      onChange: (value: number | null) => editor.onChange(value)
    }
  });
  return editor.element;
});
