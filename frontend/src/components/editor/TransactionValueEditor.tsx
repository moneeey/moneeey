import { observer } from 'mobx-react';

import { ITransaction } from '../../entities/Transaction';
import { IBaseEntity } from '../../shared/Entity';
import useMoneeeyStore from '../../shared/useMoneeeyStore';

import { EditorProps } from './EditorProps';
import { BaseNumberEditor, NumberSorter } from './NumberEditor';

import './TransactionValueEditor.less';

export const TransactionValueEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, number | string, number>) => {
    const entity = props.store.byUuid(props.entityId) as ITransaction | undefined;
    const { accounts, currencies } = useMoneeeyStore();

    const fromAcct = accounts.byUuid(entity?.from_account);
    const toAcct = accounts.byUuid(entity?.to_account);
    const isSameCurrency =
      fromAcct?.currency_uuid === toAcct?.currency_uuid || !fromAcct?.currency_uuid || !toAcct?.currency_uuid;
    const fromCurrency = currencies.byUuid(fromAcct?.currency_uuid || '');
    const toCurrency = currencies.byUuid(toAcct?.currency_uuid || '');

    if (isSameCurrency) {
      return (
        <BaseNumberEditor
          {...{
            ...props,
            rev: entity?._rev || '',
            prefix: (fromCurrency || toCurrency)?.prefix,
            suffix: (fromCurrency || toCurrency)?.suffix,
            value: (entity?.from_value || 0).toString(),
            onUpdate: (value: number) =>
              props.onUpdate(0, {
                from_value: value,
                to_value: value,
              }),
          }}
        />
      );
    }

    return (
      <div className='transactionValueEditor'>
        <BaseNumberEditor
          {...{
            ...props,
            rev: entity?._rev || '',
            prefix: fromCurrency?.prefix,
            suffix: fromCurrency?.suffix,
            value: (entity?.from_value || 0).toString(),
            field: { ...props.field, field: 'from_value' },
            onUpdate: (value: number) =>
              props.onUpdate(0, {
                from_value: value,
                to_value: entity?.to_value,
              }),
          }}
        />
        <BaseNumberEditor
          {...{
            ...props,
            rev: entity?._rev || '',
            prefix: toCurrency?.prefix,
            suffix: toCurrency?.suffix,
            value: (entity?.to_value || 0).toString(),
            field: { ...props.field, field: 'to_value' },
            onUpdate: (value: number) =>
              props.onUpdate(0, {
                from_value: entity?.from_value,
                to_value: value,
              }),
          }}
        />
      </div>
    );
  }
);

export const TransactionValueSorter = NumberSorter;
