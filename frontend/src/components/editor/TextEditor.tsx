import { Input } from 'antd'
import { observer } from 'mobx-react'
import { ChangeEvent } from 'react'
import { IBaseEntity } from '../../shared/Entity'
import MappedStore from '../../shared/MappedStore'
import { Row } from '../TableEditor'

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
        ComposedProps: (onChange: (value?: string, editorValue?: string, additional?: object) => void) => ({
          onChange: ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onChange(value, value, {}),
        })
      }}
    />
  )
})

export const TextSorter = <EntityType extends IBaseEntity,>(store: MappedStore<EntityType>, field: keyof EntityType) =>
  (a: Row, b: Row, asc: boolean): number => {
    const entityA = store.byUuid(a?.entityId||'')
    const entityB = store.byUuid(b?.entityId||'')
    const av = '' + entityA?.[field] || ''
    const bv = '' + entityB?.[field] || ''
    return asc ? av.localeCompare(bv) : bv.localeCompare(av)
  }
