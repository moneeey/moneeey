import { Input } from 'antd'
import { observer } from 'mobx-react'
import { ChangeEvent } from 'react'
import { IBaseEntity } from '../../shared/Entity'
import MappedStore from '../../shared/MappedStore'
import { Row } from '../TableEditor'

import { BaseEditor } from './BaseEditor'
import { EditorProps } from './EditorProps'

interface PrefixSuffix {
  prefix?: string;
  suffix?: string;
}

export const NumberEditor = observer(<EntityType,>(props: EditorProps<EntityType, number, number> & PrefixSuffix) => {
  const { prefix, suffix } = props
  const entity = props.store.byUuid(props.entityId)
  return (
    <BaseEditor
      {...{
        ...props,
        value: entity?.[props.field.field],
        rev: entity?._rev,
        ComposedInput: Input,
        ComposedProps: (onChange: (value?: number, editorValue?: number, additional?: Partial<EntityType>) => void) => ({
          prefix,
          suffix,
          onChange: ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onChange(parseInt(value), parseInt(value), {}),
        })
      }}
    />
  )
})

export const NumberSorter = <EntityType extends IBaseEntity,>(store: MappedStore<EntityType>, field: keyof EntityType) =>
  (a?: Row, b?: Row, asc?: boolean): number => {
    const entityA = store.byUuid(a?.entityId||'')
    const entityB = store.byUuid(b?.entityId||'')
    const av = parseInt('' + entityA?.[field] || '')
    const bv = parseInt('' + entityB?.[field] || '')
    return asc ? av - bv : bv - av
  }
