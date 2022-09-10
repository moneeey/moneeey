import { Checkbox } from 'antd'
import { CheckboxChangeEvent } from 'antd/lib/checkbox'
import { observer } from 'mobx-react'
import { BaseEditor } from './BaseEditor'
import { EditorProps, NoSorter } from './EditorProps'

export const CheckboxEditor = observer(
  <EntityType,>(props: EditorProps<EntityType, boolean, boolean>) => {
    const entity = props.store.byUuid(props.entityId)
    const value = entity?.[props.field.field]
    return (
      <BaseEditor
        {...{
          ...props,
          value,
          checked: value,
          rev: entity?._rev,
          ComposedInput: Checkbox,
          ComposedProps: (
            onChange: (
              value?: boolean,
              editorValue?: boolean,
              additional?: Partial<EntityType>
            ) => void
          ) => ({
            checked: value,
            onChange: ({ target: { checked } }: CheckboxChangeEvent) => {
              return onChange(checked, checked)
            },
          }),
        }}
      />
    )
  }
)

export const CheckboxSorter = NoSorter
