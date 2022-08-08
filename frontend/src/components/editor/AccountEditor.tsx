import { Input, Select } from 'antd';
import _, { isEmpty } from 'lodash';
import { observer } from 'mobx-react';
import { ReactNode } from 'react';
import { TAccountUUID, IAccount } from '../../shared/Account';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { TagsFrom, TagsTo } from '../Tags';

import { BaseSelectEditor } from './BaseSelectEditor';
import { EditorProps } from './EditorProps';

export interface AccountEditorProps<EntityType> extends EditorProps<EntityType, TAccountUUID, TAccountUUID> {
  accounts: IAccount[];
}

export const AccountEditor = observer(<EntityType,>(props: AccountEditorProps<EntityType>) => {
  const { accounts } = useMoneeeyStore()
  const entity = props.store.byUuid(props.entityId)
  const value = entity?.[props.field.field]
  const tags = accounts.accountTags(value)
  const TagsComponent = props.field.field === 'from_account' ? TagsFrom : TagsTo
  return (
    <Input.Group compact className="accountEditor">
      <BaseSelectEditor
        {...{
          ...props,
          value,
          rev: entity?._rev,
          options: _(props.accounts)
            .map((account) => ({ label: account.name, value: account.account_uuid }))
            .compact()
            .value(),
          ComposedProps: () => ({}),
          ComposedInput: Select
        }}
      />
      <TagsComponent tags={tags} />
    </Input.Group>
  );
});
