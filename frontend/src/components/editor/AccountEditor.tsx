import { Select } from 'antd';
import _ from 'lodash';
import { observer } from 'mobx-react';

import { BaseSelectEditor } from './BaseSelectEditor';
import { AccountEditorProps } from './EditorProps';

export const AccountEditor = observer(<EntityType,>(props: AccountEditorProps<EntityType>) => {
  return (
    <BaseSelectEditor
      {...{
        ...props,
        value: props.store.byUuid(props.entityId)?.[props.field],
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
