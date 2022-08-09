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
        ComposedProps: (onChange) => ({
          options: props.options,
          onSelect: (value: string) => onChange(value),
          ...props.ComposedProps(onChange),
        })
      }}
    />
  )
}
