import { observer } from 'mobx-react';

import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import { InputNumber } from '../base/Input';
import { Row } from '../TableEditor';

import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

interface PrefixSuffix {
  prefix?: string;
  suffix?: string;
}

interface ValueRev {
  value: string;
  rev: string;
}

export const BaseNumberEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, number, number> & PrefixSuffix & ValueRev) => {
    const { prefix, suffix } = props;

    return (
      <BaseEditor
        {...{
          ...props,
          value: parseFloat(props.value),
          rev: props.rev,
          ComposedInput: InputNumber,
          ComposedProps: (
            onChange: (value?: number, editorValue?: number, additional?: Partial<EntityType>) => void
          ) => ({
            prefix,
            suffix,
            onChange: (value: number) => onChange(value, value, {}),
          }),
        }}
      />
    );
  }
);

export const NumberEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, number | string, number> & PrefixSuffix) => {
    const entity = props.store.byUuid(props.entityId);

    return (
      <BaseNumberEditor
        {...props}
        value={((entity?.[props.field.field] as number) || '').toString()}
        rev={entity?._rev || ''}
      />
    );
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
