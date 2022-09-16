import { observer } from 'mobx-react'
import { BudgetEnvelope } from '../../entities/BudgetEnvelope'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { EditorProps, NoSorter } from './EditorProps'
import { NumberEditor } from './NumberEditor'

export const BudgetUsedEditor = observer(
  <EntityType,>(props: EditorProps<EntityType, number, number>) => {
    const entity = props.store.byUuid(props.entityId) as BudgetEnvelope
    const { currencies } = useMoneeeyStore()
    const currency = currencies.byUuid(entity.budget.currency_uuid)

    return (
      <NumberEditor
        {...{
          ...props,
          field: { ...props.field, readOnly: true },
          rev: entity?._rev,
          prefix: currency?.prefix,
          suffix: currency?.suffix,
          value: currency
            ? (currencies.formatAmount(
                currency,
                entity.used
              ) as unknown as number)
            : entity.used,
        }}
      />
    )
  }
)

export const BudgetUsedSorter = NoSorter
