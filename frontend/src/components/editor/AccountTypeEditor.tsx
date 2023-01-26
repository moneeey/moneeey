import { observer } from 'mobx-react';

import { AccountKind } from '../../entities/Account';
import { IBaseEntity } from '../../shared/Entity';
import Messages from '../../utils/Messages';
import Select from '../base/Select';

import { BaseEditor } from './BaseEditor';
import { EditorProps, NoSorter } from './EditorProps';

export const AccountTypeEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, string, string>) => {
    const entity = props.store.byUuid(props.entityId);
    const value = entity?.[props.field.field] as string;

    return (
      <BaseEditor
        {...{
          ...props,
          value,
          rev: entity?._rev || '',
        }}
        Composed={(baseProps, onChange) => (
          <Select
            {...baseProps}
            options={Object.values(AccountKind).map((accountType) => ({
              label: Messages.account.kind[accountType],
              value: accountType,
            }))}
            onChange={(newValue) => onChange(newValue || AccountKind.CHECKING)}
          />
        )}
      />
    );
  }
);

export const AccountTypeSorter = NoSorter;
