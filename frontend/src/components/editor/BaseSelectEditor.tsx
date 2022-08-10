import { BaseEditor, BaseEditorProps } from './BaseEditor'

interface BaseSelectEditorProps<EntityType, ValueEditorType, ValueEntityType> extends BaseEditorProps<EntityType, ValueEditorType, ValueEntityType> {
  options: Array<{
    label: string;
    value: ValueEditorType;
  }>;
}

export function BaseSelectEditor<EntityType, ValueEditorType, ValueEntityType>(props: BaseSelectEditorProps<EntityType, ValueEditorType, ValueEntityType>) {
  return (
    <BaseEditor
      {...{
        ...props,
        ComposedProps: (onChange: (value?: ValueEntityType, editorValue?: ValueEditorType, additional?: object) => void) => ({
          options: props.options,
          onSelect: (value: ValueEditorType) => onChange(undefined, value, undefined),
          ...props.ComposedProps(onChange),
        })
      }}
    />
  )
}
