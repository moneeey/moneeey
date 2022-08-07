import { Select } from 'antd';
import _ from 'lodash';
import { observer } from 'mobx-react';
import { TAccountUUID, IAccount } from '../../shared/Account';

import { BaseSelectEditor } from './BaseSelectEditor';
import { EditorProps } from './EditorProps';

export interface AccountEditorProps<EntityType> extends EditorProps<EntityType, TAccountUUID, TAccountUUID> {
  accounts: IAccount[];
}

export const AccountEditor = observer(<EntityType,>(props: AccountEditorProps<EntityType>) => {
  const entity = props.store.byUuid(props.entityId)
  return (
    <BaseSelectEditor
      {...{
        ...props,
        value: entity?.[props.field.field],
        rev: entity?._rev,
        options: _(props.accounts)
          .map((account) => ({ label: account.name, value: account.account_uuid }))
          .compact()
          .value(),
        ComposedProps: () => ({}),
        ComposedInput: Select
      }}
    />
  );
});
