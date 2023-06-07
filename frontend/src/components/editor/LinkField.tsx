import { observer } from 'mobx-react';

import { LinkButton } from '../base/Button';

import { FieldAcessor, FieldDefHelper, FieldRenderProps } from './FieldDef';

export default function <TEntity>({
  read,
  onClick,
}: FieldAcessor<TEntity, string> & { onClick: (entity: TEntity) => void }): FieldDefHelper<TEntity> {
  return {
    render: observer(({ entity, field }: FieldRenderProps<TEntity>) => (
      <LinkButton
        className='p-0'
        data-test-id={`editor${field.title.replace(' ', '_')}`}
        onClick={() => onClick(entity)}>
        {read(entity)}
      </LinkButton>
    )),
    sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
      asc ? read(a).localeCompare(read(b)) : read(b).localeCompare(read(a)),
  };
}
