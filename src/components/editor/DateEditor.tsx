import { DatePicker } from 'antd';
import { observer } from 'mobx-react';
import moment from 'moment';

import { formatDate } from '../../shared/Date';
import { BaseEditor } from './BaseEditor';
import { DateEditorProps } from './EditorProps';

export const DateEditor = observer(<EntityType,>(props: DateEditorProps<EntityType>) => {
  const editor = BaseEditor({
    ...props,
    ComposedInput: DatePicker,
    ComposedProps: {
      value: ((props.entity as any)[props.field] && moment((props.entity as any)[props.field])) || moment(),
      onSelect: (value: moment.Moment) => editor.onChange(formatDate(value.toDate()), value)
    }
  });
  return editor.element;
});
