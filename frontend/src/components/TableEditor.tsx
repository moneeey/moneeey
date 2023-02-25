import { compact, flatten, uniq, values } from 'lodash';
import { observer } from 'mobx-react';
import { useMemo, useState } from 'react';

import { IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';
import useMoneeeyStore from '../shared/useMoneeeyStore';
import { currentDateTime, dateDistanceInSecs, parseDateTime } from '../utils/Date';

import { FieldProps } from './editor/EditorProps';
import VirtualTable from './VirtualTableEditor';

import './TableEditor.less';
import { WithDataTestId } from './base/Common';
import { TableColumnDefForField } from './editor/RenderEditor';

interface TableEditorProps<T extends IBaseEntity, Context> extends WithDataTestId {
  store: MappedStore<T>;
  schemaFilter?: (row: T) => boolean;
  factory: (id?: string) => T;
  creatable?: boolean;
  context?: Context;
  showRecentEntries?: boolean;
}

export default observer(
  <T extends IBaseEntity>({
    schemaFilter,
    store,
    factory,
    creatable,
    context,
    showRecentEntries,
  }: TableEditorProps<T, unknown>) => {
    const moneeeyStore = useMoneeeyStore();

    const [newEntityId, setNewEntityId] = useState(() => store.getUuid(store.factory()));

    const storeIds = store.ids;

    const entities = useMemo(
      () =>
        uniq(
          storeIds
            .map((id) => store.byUuid(id) as T)
            .filter((row) => {
              const isSchemaFiltered = !schemaFilter || schemaFilter(row);
              const isRecent =
                showRecentEntries !== false &&
                row.updated &&
                dateDistanceInSecs(parseDateTime(row.updated), parseDateTime(currentDateTime())) < 20;
              const isNewEntityId = store.getUuid(row) === newEntityId;

              return isSchemaFiltered || isRecent || isNewEntityId;
            })
            .map((row) => store.getUuid(row))
            .map((entityId) => {
              if (entityId === newEntityId) {
                setTimeout(() => setNewEntityId(store.getUuid(factory())), 500);
              }

              return entityId;
            })
            .concat(creatable === false ? [] : [newEntityId])
        ).map((entityId) => ({ entityId })),
      [storeIds, store, schemaFilter, newEntityId]
    );

    const columns = useMemo(
      () =>
        compact(flatten([...values(store.schema()), ...values(store.additionalSchema ? store.additionalSchema() : [])]))
          .map((field) => {
            return TableColumnDefForField({
              context,
              factory,
              field: field as FieldProps<never>,
              moneeeyStore,
              store,
            });
          })
          .sort((a, b) => a.index - b.index),
      [store]
    );

    return (
      <VirtualTable
        className='tableEditor'
        columns={columns}
        rows={entities}
        isNewEntity={(row) => row.entityId === newEntityId}
      />
    );
  }
);
