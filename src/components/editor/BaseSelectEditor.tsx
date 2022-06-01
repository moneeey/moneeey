import { BaseEditor, BaseEditorProps } from './BaseEditor';

interface BaseSelectEditorProps<EntityType> extends BaseEditorProps<EntityType>{
  options: Array<{
    label: string;
    value: any;
  }>;
}

export function BaseSelectEditor<EntityType>(props: BaseSelectEditorProps<EntityType>) {
  const editor = BaseEditor({
    ...props,
    ComposedProps: {
      ...props.ComposedProps,
      options: props.options,
      onSelect: (value: string) => editor.onChange(value)
    }
  });
  return editor;
}
