import _ from 'lodash';
import { observer } from 'mobx-react';

import { TCurrencyUUID } from '../../entities/Currency';
import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import MoneeeyStore from '../../shared/MoneeeyStore';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Select from '../base/Select';

import { BaseEditor } from './BaseEditor';
import { EditorProps, Row } from './EditorProps';

export const CurrencyEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, TCurrencyUUID, TCurrencyUUID>) => {
    const { currencies } = useMoneeeyStore();
    const entity = props.store.byUuid(props.entityId);
    const value = (entity?.[props.field.field] as TCurrencyUUID | undefined) || '';

    return (
      <BaseEditor
        {...{
          ...props,
          value,
          rev: entity?._rev || '',
        }}
        Composed={(baseProps, onChange) => (
          <Select
            {...baseProps}
            options={_(currencies.all)
              .map((currency) => ({
                label: (
                  <span>
                    <b>{currency.short}</b> {currency.name}
                  </span>
                ),
                value: currency.currency_uuid,
              }))
              .value()}
            onChange={(newValue) => newValue && onChange(newValue)}
          />
        )}
      />
    );
  }
);

export const CurrencySorter =
  <EntityType extends IBaseEntity>(
    store: MappedStore<EntityType>,
    field: keyof EntityType,
    moneeeyStore: MoneeeyStore
  ) =>
  (a?: Row, b?: Row, asc?: boolean): number => {
    const entityA = store.byUuid(a?.entityId || '');
    const entityB = store.byUuid(b?.entityId || '');
    const currencyUuidA = (entityA?.[field] as TCurrencyUUID | undefined) || '';
    const currencyUuidB = (entityB?.[field] as TCurrencyUUID | undefined) || '';
    const av = moneeeyStore.currencies.nameForUuid(currencyUuidA);
    const bv = moneeeyStore.currencies.nameForUuid(currencyUuidB);

    return asc ? av.localeCompare(bv) : bv.localeCompare(av);
  };
