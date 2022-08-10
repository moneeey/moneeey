import { Select } from 'antd'
import _ from 'lodash'
import { observer } from 'mobx-react'
import { TCurrencyUUID } from '../../entities/Currency'
import { IBaseEntity } from '../../shared/Entity'
import MappedStore from '../../shared/MappedStore'
import MoneeeyStore from '../../shared/MoneeeyStore'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { Row } from '../TableEditor'

import { BaseSelectEditor } from './BaseSelectEditor'
import { EditorProps } from './EditorProps'

export const CurrencyEditor = observer(<EntityType,>(props: EditorProps<EntityType, TCurrencyUUID, TCurrencyUUID>) => {
  const { currencies } = useMoneeeyStore()
  const entity = props.store.byUuid(props.entityId)
  return (
    <BaseSelectEditor
      {...{
        ...props,
        value: entity?.[props.field.field],
        rev: entity?._rev,
        options: _(currencies.all)
          .map((currency) => ({ label: currency.name, value: currency.currency_uuid }))
          .value(),
        ComposedProps: () => ({}),
        ComposedInput: Select
      }}
    />
  )
})

export const CurrencySorter = <EntityType extends IBaseEntity,>(store: MappedStore<EntityType>, field: keyof EntityType, moneeeyStore: MoneeeyStore) =>
  (a?: Row, b?: Row, asc?: boolean): number => {
    const entityA = store.byUuid(a?.entityId||'')
    const entityB = store.byUuid(b?.entityId||'')
    const av = moneeeyStore.currencies.nameForUuid('' + entityA?.[field] || '')
    const bv = moneeeyStore.currencies.nameForUuid('' + entityB?.[field] || '')
    return asc ? av.localeCompare(bv) : bv.localeCompare(av)
  }
