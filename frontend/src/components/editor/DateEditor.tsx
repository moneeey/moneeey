import { DatePicker } from 'antd'
import { observer } from 'mobx-react'
import moment from 'moment'
import { IBaseEntity } from '../../shared/Entity'
import MappedStore from '../../shared/MappedStore'

import { formatDate, TDate, compareDates } from '../../utils/Date'
import { Row } from '../TableEditor'
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
          onSelect: (value: moment.Moment) => onChange(formatDate(value.toDate()), value, {}),
          allowClear: !props.field.readOnly,
          disabled: !!props.field.readOnly,
        })
      }}
    />
  )
})

export const DateSorter = <EntityType extends IBaseEntity,>(store: MappedStore<EntityType>, field: keyof EntityType) =>
  (a?: Row, b?: Row, asc?: boolean): number => {
    const entityA = store.byUuid(a?.entityId||'')
    const entityB = store.byUuid(b?.entityId||'')
    const av = '' + entityA?.[field] || ''
    const bv = '' + entityB?.[field] || ''

    return asc ? compareDates(av, bv) : compareDates(bv, av)
  }
