import { observer } from 'mobx-react'

import { BudgetEnvelope } from '../../entities/BudgetEnvelope'
import { IBaseEntity } from '../../shared/Entity'
import useMoneeeyStore from '../../shared/useMoneeeyStore'

import { EditorProps, NoSorter } from './EditorProps'
import { BaseNumberEditor } from './NumberEditor'

export const BudgetUsedEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, string, number>) => {
    const entity = props.store.byUuid(props.entityId) as BudgetEnvelope | undefined
    const { currencies } = useMoneeeyStore()
    const currency = currencies.byUuid(entity?.budget.currency_uuid)

    let value: string
    if (currency) {
      value = currencies.formatAmount(currency, entity?.used || 0)
    } else {
      value = (entity?.used || 0).toString()
    }

    return (
      <BaseNumberEditor
        {...{
          ...props,
          value,
          field: { ...props.field, readOnly: true },
          rev: entity?._rev || '',
          prefix: currency?.prefix,
          suffix: currency?.suffix,
        }}
      />
    )
  }
)

export const BudgetUsedSorter = NoSorter
