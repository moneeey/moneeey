import { observer } from 'mobx-react';

import { AccountKind } from '../../entities/Account';
import Messages from '../../utils/Messages';
import Select from '../base/Select';

import { FieldAcessor, FieldDefHelper, FieldRenderProps } from './FieldDef';

export default function <TEntity>({ read, delta }: FieldAcessor<TEntity, AccountKind>): FieldDefHelper<TEntity> {
  return {
    render: observer(({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
      <Select
        data-test-id={`editor${field.title.replace(' ', '_')}`}
        readOnly={field.readOnly}
        placeholder={field.title}
        isError={isError}
        value={read(entity)}
        options={Object.values(AccountKind).map((accountType) => ({
          label: Messages.account.kind[accountType],
          value: accountType,
        }))}
        onChange={(value: string) => commit({ ...entity, ...delta(value as AccountKind) })}
      />
    )),
    sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
      asc ? read(a).localeCompare(read(b)) : read(b).localeCompare(read(a)),
  };
}
