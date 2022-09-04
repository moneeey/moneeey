import { observer } from 'mobx-react'
import { BudgetEnvelope } from '../../entities/Budget'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { EditorProps, NoSorter } from './EditorProps'
import { NumberEditor } from './NumberEditor'

export const BudgetRemainingEditor = observer(
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
          value: 0,
        }}
      />
    )
  }
)

export const BudgetRemainingSorter = NoSorter
