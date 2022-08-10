import { DatePicker } from 'antd'
import { observer } from 'mobx-react'
import moment from 'moment'

import { formatDate, TDate } from '../../utils/Date'
import { BaseEditor } from './BaseEditor'
import { EditorProps } from './EditorProps'

export const DateEditor = observer(<EntityType,>(props: EditorProps<EntityType, moment.Moment, TDate>) => {
  const entity = props.store.byUuid(props.entityId)
  return (
    <BaseEditor
      {...{
        ...props,
        value: moment(entity?.[props.field.field]),
        rev: entity?._rev,
        ComposedInput: DatePicker,
        ComposedProps: (onChange: (value?: TDate, editorValue?: moment.Moment, additional?: Partial<EntityType>) => void) => ({
          onSelect: (value: moment.Moment) => onChange(formatDate(value.toDate()), value, {})
        })
      }}
    />
  )
})
