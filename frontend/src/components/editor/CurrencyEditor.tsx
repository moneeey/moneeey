import { Select } from 'antd'
import _ from 'lodash'
import { observer } from 'mobx-react'
import { TCurrencyUUID } from '../../entities/Currency'
import useMoneeeyStore from '../../shared/useMoneeeyStore'

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
