import { observer } from 'mobx-react';

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
          rev: entity?._rev || '',
        }}
        Composed={({ onChange, ...baseProps }) => (
          <Checkbox
            {...{ ...baseProps, 'data-test-id': baseProps['data-test-id'] || '' }}
            onChange={(newValue) => onChange(newValue, newValue)}>
            {props.field.title}
          </Checkbox>
        )}
      />
    );
  }
);

export const CheckboxSorter = NoSorter;
