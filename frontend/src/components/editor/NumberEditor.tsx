import { observer } from 'mobx-react';

import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { InputNumber } from '../base/Input';
import { Row } from '../TableEditor';

import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

interface PrefixSuffix {
  prefix?: string;
  suffix?: string;
}

interface ValueRev {
  value: number;
  rev: string;
}

export const BaseNumberEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, number, number> & PrefixSuffix & ValueRev) => {
    const { prefix, suffix } = props;
    const { config } = useMoneeeyStore();
    const { thousand_separator: thousandSeparator, decimal_separator: decimalSeparator } = config.main;

    return (
      <BaseEditor
        {...{
          ...props,
          value: props.value,
          rev: props.rev || '',
        }}
        Composed={(baseProps, onChange) => (
          <InputNumber
            {...{ ...baseProps, prefix, suffix, decimalSeparator, thousandSeparator, decimalScale: 20 }}
            onChange={(newValue) => onChange(newValue, newValue)}
          />
        )}
      />
    );
  }
);

export const NumberEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, number | string, number> & PrefixSuffix) => {
    const entity = props.store.byUuid(props.entityId);
    const value = (entity?.[props.field.field] as number) || 0;

    return <BaseNumberEditor {...props} value={value} rev={entity?._rev || ''} />;
  }
);

export const NumberSorter =
  <EntityType extends IBaseEntity>(store: MappedStore<EntityType>, field: keyof EntityType) =>
  (a?: Row, b?: Row, asc?: boolean): number => {
    const entityA = store.byUuid(a?.entityId || '');
    const entityB = store.byUuid(b?.entityId || '');
    const av = entityA?.[field] as number;
    const bv = entityB?.[field] as number;

    return asc ? av - bv : bv - av;
  };
