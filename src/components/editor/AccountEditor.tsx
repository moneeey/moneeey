import { Select } from 'antd';
import _ from 'lodash';
import { observer } from 'mobx-react';

import { BaseSelectEditor } from './BaseSelectEditor';
import { AccountEditorProps } from './EditorProps';

export const AccountEditor = observer(<EntityType,>(props: AccountEditorProps<EntityType>) => {
  const editor = BaseSelectEditor({
    ...props,
    options: _(props.accounts)
      .map((account) => ({ label: account.name, value: account.account_uuid }))
      .compact()
      .value(),
    ComposedProps: {
      value: (props.entity as any)[props.field],
    },
    ComposedInput: Select,
  });
  return editor.element;
});
