import { observer } from 'mobx-react';

import { BudgetEnvelope } from '../../entities/BudgetEnvelope';
import { IBaseEntity } from '../../shared/Entity';
import useMoneeeyStore from '../../shared/useMoneeeyStore';

import { EditorProps, NoSorter } from './EditorProps';
import { BaseNumberEditor } from './NumberEditor';

export const BudgetAllocatedEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, string, number>) => {
    const entity = props.store.byUuid(props.entityId) as BudgetEnvelope | undefined;
    const { budget, currencies } = useMoneeeyStore();
    const currency = currencies.byUuid(entity?.budget.currency_uuid);

    const allocated = entity?.allocated || 0;

    return (
      <BaseNumberEditor
        {...{
          ...props,
          rev: entity?._rev || '',
          prefix: currency?.prefix,
          suffix: currency?.suffix,
          value: currency ? currencies.formatAmount(currency, allocated) : allocated.toString(),
          onUpdate: (newValue: number) => {
            if (entity?.budget) {
              budget.setAllocation(entity?.budget, entity?.starting, isNaN(newValue) ? 0 : newValue);
            }

            return {} as EntityType;
          },
        }}
      />
    );
  }
);

export const BudgetAllocatedSorter = NoSorter;
