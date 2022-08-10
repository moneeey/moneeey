import { observer } from 'mobx-react'
import { ITransaction } from '../../entities/Transaction'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { EditorProps } from './EditorProps'
import { NumberEditor } from './NumberEditor'

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
      prefix: fromCurrency?.prefix,
      suffix: fromCurrency?.suffix,
      value: entity?.from_value,
      onUpdate: (value: number) => props.onUpdate(0, {
        from_value: value,
        to_value: value,
      }),
    }} />
  } else {
    return <>
      <NumberEditor {...{
        ...props,
        prefix: fromCurrency?.prefix,
        suffix: fromCurrency?.suffix,
        value: entity?.from_value,
        onUpdate: (value: number) => props.onUpdate(0, {
          from_value: value,
          to_value: entity?.to_value,
        }),
      }} />
      <NumberEditor {...{
        ...props,
        prefix: toCurrency?.prefix,
        suffix: toCurrency?.suffix,
        value: entity?.to_value,
        onUpdate: (value: number) => props.onUpdate(0, {
          from_value: entity?.from_value,
          to_value: value,
        }),
      }} />
    </>
  }
})