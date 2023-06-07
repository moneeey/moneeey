import { observer } from 'mobx-react';

import { Checkbox } from '../base/Input';

import { FieldAcessor, FieldDefHelper, FieldRenderProps } from './FieldDef';

export default function <TEntity>({ read, delta }: FieldAcessor<TEntity, boolean>): FieldDefHelper<TEntity> {
  return {
    render: observer(({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
      <Checkbox
        data-test-id={`editor${field.title.replace(' ', '_')}`}
        readOnly={field.readOnly}
        placeholder={field.title}
        isError={isError}
        value={read(entity)}
        onChange={(value: boolean) => commit({ ...entity, ...delta(value) })}>
        {field.title}
      </Checkbox>
    )),
    sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
      asc ? Number(read(a)) - Number(read(b)) : Number(read(b)) - Number(read(a)),
  };
}
