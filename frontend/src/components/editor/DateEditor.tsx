import { DatePicker } from 'antd';
import { observer } from 'mobx-react';
import moment from 'moment';

import { formatDate } from '../../shared/Date';
import { BaseEditor } from './BaseEditor';
import { DateEditorProps } from './EditorProps';

export const DateEditor = observer(<EntityType,>(props: DateEditorProps<EntityType>) => {
  return (
    <BaseEditor
      {...{
        ...props,
        value: moment(props.store.byUuid(props.entityId)?.[props.field]),
        ComposedInput: DatePicker,
        ComposedProps: (onChange) => ({
          onSelect: (value: moment.Moment) => onChange(formatDate(value.toDate()), value)
        })
      }}
    />
  );
});
