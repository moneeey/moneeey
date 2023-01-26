import { observer } from 'mobx-react';

import { Input } from '../base/Input';
import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import { Row } from '../TableEditor';

import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

export const TextEditor = observer(<EntityType extends IBaseEntity>(props: EditorProps<EntityType, string, string>) => {
  const entity = props.store.byUuid(props.entityId);
  const value = (entity?.[props.field.field] as string) || '';

  return (
    <BaseEditor
      {...{
        ...props,
        value,
        rev: entity?._rev || '',
      }}
      Composed={(baseProps, onChange) => (
        <Input {...{ ...baseProps }} onChange={(newValue) => onChange(newValue, newValue)} />
      )}
    />
  );
});

export const TextSorter =
  <EntityType extends IBaseEntity>(store: MappedStore<EntityType>, field: keyof EntityType) =>
  (a: Row, b: Row, asc: boolean): number => {
    const entityA = store.byUuid(a?.entityId || '');
    const entityB = store.byUuid(b?.entityId || '');
    const valueA = entityA?.[field] as string;
    const valueB = entityB?.[field] as string;
    const av = `${valueA}` || '';
    const bv = `${valueB}` || '';

    return asc ? av.localeCompare(bv) : bv.localeCompare(av);
  };
