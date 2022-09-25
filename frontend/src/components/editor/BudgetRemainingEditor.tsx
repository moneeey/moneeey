import { observer } from 'mobx-react'

import { BudgetEnvelope } from '../../entities/BudgetEnvelope'
import useMoneeeyStore from '../../shared/useMoneeeyStore'

import { EditorProps, NoSorter } from './EditorProps'
import { BaseNumberEditor } from './NumberEditor'

export const BudgetRemainingEditor = observer(<EntityType,>(props: EditorProps<EntityType, number, number>) => {
  const entity = props.store.byUuid(props.entityId) as BudgetEnvelope
  const { currencies, budget } = useMoneeeyStore()
  const currency = currencies.byUuid(entity.budget.currency_uuid)

  const remaining = budget.getRemaining(entity)

  return (
    <div className={remaining >= 0 ? '' : 'negative'}>
      <BaseNumberEditor
        {...{
          ...props,
          field: { ...props.field, readOnly: true },
          rev: entity?._rev,
          prefix: currency?.prefix,
          suffix: currency?.suffix,
          value: currency ? (currencies.formatAmount(currency, remaining) as unknown as number) : remaining,
        }}
      />
    </div>
  )
})

export const BudgetRemainingSorter = NoSorter
