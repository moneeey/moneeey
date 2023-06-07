import { compact, flatten, uniq, values } from 'lodash';
import { observer } from 'mobx-react';
import { useMemo, useState } from 'react';

import { IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';
import useMoneeeyStore from '../shared/useMoneeeyStore';
import { currentDateTime, dateDistanceInSecs, parseDateTime } from '../utils/Date';

import VirtualTable from './VirtualTableEditor';

import { WithDataTestId } from './base/Common';
import { TableColumnDefForField } from './editor/RenderEditor';
import { FieldProps } from './editor/EditorProps';

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

    const columns = useMemo(() => {
      const schemaFields = values(store.schema());
      const additionalFields = values(store.additionalSchema ? store.additionalSchema() : []);
      const allFields = compact(flatten([schemaFields, additionalFields])) as FieldProps<never>[];

      return allFields
        .filter((field) => !field.isVisible || field.isVisible(context as object))
        .sort((a, b) => a.index - b.index)
        .map((field) => {
          return TableColumnDefForField({
            context,
            factory,
            field,
            moneeeyStore,
            store,
          });
        });
    }, [store, context]);

    return <VirtualTable columns={columns} rows={entities} isNewEntity={(row) => row.entityId === newEntityId} />;
  }
);
