import { observer } from 'mobx-react';

import { FieldAcessor, FieldDefHelper, FieldRenderProps } from './FieldDef';

export default function <TEntity>({ read }: FieldAcessor<TEntity, string>): FieldDefHelper<TEntity> {
  return {
    render: observer(({ entity, field }: FieldRenderProps<TEntity>) => (
      <span data-test-id={`editor${field.title.replace(' ', '_')}`}>{read(entity)}</span>
    )),
    sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
      asc ? read(a).localeCompare(read(b)) : read(b).localeCompare(read(a)),
  };
}
