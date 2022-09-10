import { ReactNode, useMemo, useState } from 'react'
import { BaseEditor, BaseEditorProps } from './BaseEditor'

interface BaseSelectEditorProps<EntityType, ValueEditorType, ValueEntityType>
  extends BaseEditorProps<EntityType, ValueEditorType, ValueEntityType> {
  options: Array<{
    label: string | ReactNode
    labelText?: string
    value: ValueEditorType
  }>
}

export function BaseSelectEditor<EntityType, ValueEditorType, ValueEntityType>(
  props: BaseSelectEditorProps<EntityType, ValueEditorType, ValueEntityType>
) {
  const [search, setSearch] = useState('')
  const options = useMemo(
    () =>
      props.options.filter((option) =>
        (option.labelText || '' + option.label).toLowerCase().includes(search)
      ),
    [props.options, search]
  )
  return (
    <BaseEditor
      {...{
        ...props,
        options,
        ComposedProps: (
          onChange: (
            value?: ValueEntityType,
            editorValue?: ValueEditorType,
            additional?: Partial<EntityType>
          ) => void
        ) => ({
          options,
          showSearch: true,
          onSearch: (value: string) => setSearch(value.toLowerCase()),
          onSelect: (value: ValueEditorType) =>
            onChange(undefined, value, undefined),
          ...props.ComposedProps(onChange),
        }),
      }}
    />
  )
}
