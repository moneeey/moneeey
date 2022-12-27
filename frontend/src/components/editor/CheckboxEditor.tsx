import { observer } from 'mobx-react';
import { ChangeEvent } from 'react';

import { IBaseEntity } from '../../shared/Entity';
import { Checkbox } from '../base/Input';

import { BaseEditor } from './BaseEditor';
import { EditorProps, NoSorter } from './EditorProps';

export const CheckboxEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, boolean, boolean>) => {
    const entity = props.store.byUuid(props.entityId);
    const value = entity?.[props.field.field] === true;

    return (
      <BaseEditor
        {...{
          ...props,
          value,
          checked: value,
          rev: entity?._rev || '',
          ComposedInput: Checkbox,
          ComposedProps: (
            onChange: (value?: boolean, editorValue?: boolean, additional?: Partial<EntityType>) => void
          ) => ({
            checked: value,
            onChange: ({ target: { checked } }: ChangeEvent<HTMLInputElement>) => {
              return onChange(checked, checked);
            },
          }),
        }}
      />
    );
  }
);

export const CheckboxSorter = NoSorter;
