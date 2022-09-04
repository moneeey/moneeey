import { observer } from 'mobx-react'
import { BudgetEnvelope, IBudget } from '../../entities/Budget'
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
          value: entity.allocated,
          onUpdate: (value: number) => {
            budget.setAllocation(entity.budget, entity.starting, value)
          },
        }}
      />
    )
  }
)

export const BudgetAllocatedSorter = NoSorter
