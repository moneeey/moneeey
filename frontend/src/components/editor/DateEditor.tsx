import { DatePicker } from 'antd';
import { observer } from 'mobx-react';
import moment from 'moment';

import { formatDate, TDate } from '../../shared/Date';
import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

export interface DateEditorProps<EntityType> extends EditorProps<EntityType, moment.Moment, TDate> {
}

export const DateEditor = observer(<EntityType,>(props: DateEditorProps<EntityType>) => {
  const entity = props.store.byUuid(props.entityId)
  return (
    <BaseEditor
      {...{
        ...props,
        value: moment(entity?.[props.field.field]),
        rev: entity?._rev,
        ComposedInput: DatePicker,
        ComposedProps: (onChange) => ({
          onSelect: (value: moment.Moment) => onChange(formatDate(value.toDate()), value)
        })
      }}
    />
  );
});
