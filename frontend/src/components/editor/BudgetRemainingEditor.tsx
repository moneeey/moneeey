import { observer } from 'mobx-react';

import { BudgetEnvelope } from '../../entities/BudgetEnvelope';
import { IBaseEntity } from '../../shared/Entity';
import useMoneeeyStore from '../../shared/useMoneeeyStore';

import { EditorProps, NoSorter } from './EditorProps';
import { BaseNumberEditor } from './NumberEditor';

export const BudgetRemainingEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, number | string, number>) => {
    const entity = props.store.byUuid(props.entityId) as BudgetEnvelope | undefined;
    const { currencies, budget } = useMoneeeyStore();
    const currency = currencies.byUuid(entity?.budget.currency_uuid);

    const remaining = entity ? budget.getRemaining(entity) : 0;

    return (
      <div className={remaining >= 0 ? '' : 'negative'}>
        <BaseNumberEditor
          {...{
            ...props,
            field: { ...props.field, readOnly: true },
            rev: entity?._rev || '',
            prefix: currency?.prefix,
            suffix: currency?.suffix,
            value: currency ? currencies.formatAmount(currency, remaining) : remaining.toString(),
          }}
        />
      </div>
    );
  }
);

export const BudgetRemainingSorter = NoSorter;
