import { Input } from 'antd'
import { observer } from 'mobx-react'
import { ChangeEvent, useState } from 'react'
import { TagsMemo } from '../Tags'
import { BaseEditor } from './BaseEditor'
import { EditorProps } from './EditorProps'

export const MemoEditor = observer(<EntityType,>(props: EditorProps<EntityType, string, string>) => {
  const tagsForText = (text: string): string[] => Array.from(text.matchAll(/[^#](#\w+)/g)).map((m: RegExpMatchArray) => m[1].replace('#', ''))

  const entity = props.store.byUuid(props.entityId)
  const value = entity?.[props.field.field]

  const [currentValue, setCurrentValue] = useState('')
  const memo = (currentValue || value || '')
  const tags = tagsForText(memo)

  return (
    <BaseEditor
      {...{
        ...props,
        value: memo.replace('##', '#'),
        rev: entity?._rev,
        ComposedInput: Input,
        ComposedProps: (onChange: (value?: string, editorValue?: string, additional?: Partial<EntityType>) => void) => ({
          onChange: ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
            setCurrentValue(value)
            return onChange(value, value, { tags: tagsForText(value) } as unknown as Partial<EntityType>)
          },
          addonAfter: <TagsMemo tags={tags} />,
        })
      }}
    />
  )
})
