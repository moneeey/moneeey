import { observer } from 'mobx-react';

import { BudgetEnvelope } from '../../entities/BudgetEnvelope';

import { IBaseEntity } from '../../shared/Entity';
import useMoneeeyStore from '../../shared/useMoneeeyStore';

import { EditorProps } from './EditorProps';
import { BaseNumberEditor, NumberSorter } from './NumberEditor';

export const BudgetValueEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, number, number>) => {
    const entity = props.store.byUuid(props.entityId) as BudgetEnvelope | undefined;
    const { currencies } = useMoneeeyStore();

    const value = (entity?.[props.field.field] as number) || 0;
    const currency = entity && currencies.byUuid(entity.budget.currency_uuid || '');

    return (
      <BaseNumberEditor
        {...{
          ...props,
          rev: entity?._rev || '',
          prefix: currency?.prefix,
          suffix: currency?.suffix,
          value,
        }}
      />
    );
  }
);

export const BudgetValueSorter = NumberSorter;
