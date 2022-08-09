import { Input } from 'antd'
import { observer } from 'mobx-react'
import { ChangeEvent } from 'react'

import { BaseEditor } from './BaseEditor'
import { EditorProps } from './EditorProps'

export const TextEditor = observer(<EntityType,>(props: EditorProps<EntityType, string, string>) => {
  const entity = props.store.byUuid(props.entityId)
  return (
    <BaseEditor
      {...{
        ...props,
        value: entity?.[props.field.field],
        rev: entity?._rev,
        ComposedInput: Input,
        ComposedProps: (onChange) => ({
          onChange: ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onChange(value),
        })
      }}
    />
  )
})
