import { observer } from 'mobx-react'
import { BudgetEnvelope } from '../../entities/BudgetEnvelope'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { EditorProps, NoSorter } from './EditorProps'
import { NumberEditor } from './NumberEditor'

export const BudgetAllocatedEditor = observer(
  <EntityType,>(props: EditorProps<EntityType, number, number>) => {
    const entity = props.store.byUuid(props.entityId) as BudgetEnvelope
    const { budget, currencies } = useMoneeeyStore()
    const currency = currencies.byUuid(entity.budget.currency_uuid)

    return (
      <NumberEditor
        {...{
          ...props,
          rev: entity?._rev,
          prefix: currency?.prefix,
          suffix: currency?.suffix,
          value: currency
            ? (currencies.formatAmount(
                currency,
                entity.allocated
              ) as unknown as number)
            : entity.allocated,
          onUpdate: (value: number) =>
            budget.setAllocation(
              entity.budget,
              entity.starting,
              isNaN(value) ? 0 : value
            ),
        }}
      />
    )
  }
)

export const BudgetAllocatedSorter = NoSorter
