import { observer } from 'mobx-react'
import { ITransaction } from '../../entities/Transaction'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { EditorProps } from './EditorProps'
import { NumberEditor, NumberSorter } from './NumberEditor'

export const TransactionValueEditor = observer(<EntityType,>(props: EditorProps<EntityType, number, number>) => {
  const entity = props.store.byUuid(props.entityId) as ITransaction
  const { accounts, currencies } = useMoneeeyStore()

  const fromAcct = accounts.byUuid(entity?.from_account)
  const toAcct = accounts.byUuid(entity?.to_account)
  const isSameCurrency = fromAcct?.currency_uuid === toAcct?.currency_uuid
  const fromCurrency = currencies.byUuid(fromAcct?.currency_uuid || '')
  const toCurrency = currencies.byUuid(toAcct?.currency_uuid || '')

  if (isSameCurrency) {
    return <NumberEditor {...{
      ...props,
      rev: entity?._rev,
      prefix: fromCurrency?.prefix,
      suffix: fromCurrency?.suffix,
      value: entity?.from_value,
      onUpdate: (value: number) => props.onUpdate(0, {
        from_value: value,
        to_value: value,
      }),
    }} />
  } else {
    return <div className="transactionMultiEditor">
      <NumberEditor {...{
        ...props,
        rev: entity?._rev,
        prefix: fromCurrency?.prefix,
        suffix: fromCurrency?.suffix,
        value: entity?.from_value,
        field: { ...props.field, field: 'from_value' },
        onUpdate: (value: number) => props.onUpdate(0, {
          from_value: value,
          to_value: entity?.to_value,
        }),
      }} />
      <NumberEditor {...{
        ...props,
        rev: entity?._rev,
        prefix: toCurrency?.prefix,
        suffix: toCurrency?.suffix,
        value: entity?.to_value,
        field: { ...props.field, field: 'to_value' },
        onUpdate: (value: number) => props.onUpdate(0, {
          from_value: entity?.from_value,
          to_value: value,
        }),
      }} />
    </div>
  }
})

export const TransactionValueSorter = NumberSorter