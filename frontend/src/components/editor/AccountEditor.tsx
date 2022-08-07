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
  return (
    <BaseSelectEditor
      {...{
        ...props,
        value: props.store.byUuid(props.entityId)?.[props.field.field],
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
