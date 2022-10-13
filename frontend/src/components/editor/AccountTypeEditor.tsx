import { observer } from 'mobx-react';

import { AccountKind } from '../../entities/Account';
import { IBaseEntity } from '../../shared/Entity';
import Messages from '../../utils/Messages';
import Select from '../base/Select';

import BaseSelectEditor from './BaseSelectEditor';
import { EditorProps, NoSorter } from './EditorProps';

export const AccountTypeEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, string, string>) => {
    const entity = props.store.byUuid(props.entityId);
    const currentValue = entity?.[props.field.field] as string;

    return (
      <BaseSelectEditor
        {...{
          ...props,
          options: Object.values(AccountKind).map((accountType) => ({
            labelText: Messages.account.kind[accountType],
            label: Messages.account.kind[accountType],
            value: accountType,
          })),
          value: currentValue,
          rev: entity?._rev || '',
          ComposedProps: (onChange: (value?: string, editorValue?: string, additional?: object) => void) => ({
            onSelect: (value: string) => onChange(value || AccountKind.CHECKING),
          }),
          ComposedInput: Select,
        }}
      />
    );
  }
);

export const AccountTypeSorter = NoSorter;
