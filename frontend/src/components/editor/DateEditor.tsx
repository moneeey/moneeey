import { observer } from 'mobx-react';

import moment from 'moment';

import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';

import { TDate, compareDates, formatDate } from '../../utils/Date';
import DatePicker from '../base/DatePicker';
import { Row } from '../TableEditor';

import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

export const DateEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, moment.Moment, TDate>) => {
    const entity = props.store.byUuid(props.entityId);
    const value = moment(entity?.[props.field.field] as TDate);

    return (
      <BaseEditor
        {...{
          ...props,
          value,
          rev: entity?._rev || '',
        }}
        Composed={(baseProps, onChange) => (
          <DatePicker
            {...baseProps}
            allowClear={props.field.readOnly}
            onSelect={(newValue) => onChange(formatDate(newValue.toDate()), newValue)}
          />
        )}
      />
    );
  }
);

export const DateSorter =
  <EntityType extends IBaseEntity>(store: MappedStore<EntityType>, field: keyof EntityType) =>
  (a?: Row, b?: Row, asc?: boolean): number => {
    const entityA = store.byUuid(a?.entityId || '');
    const entityB = store.byUuid(b?.entityId || '');
    const av = (entityA?.[field] as string) || '';
    const bv = (entityB?.[field] as string) || '';

    return asc ? compareDates(av, bv) : compareDates(bv, av);
  };
