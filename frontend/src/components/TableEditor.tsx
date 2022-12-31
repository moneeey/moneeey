import { compact, uniq, values } from 'lodash';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useMemo, useState } from 'react';

import { IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';
import MoneeeyStore from '../shared/MoneeeyStore';
import useMoneeeyStore from '../shared/useMoneeeyStore';
import { currentDateTime, dateDistanceInSecs, parseDateTime } from '../utils/Date';

import { AccountEditor, AccountSorter } from './editor/AccountEditor';
import { BudgetAllocatedEditor, BudgetAllocatedSorter } from './editor/BudgetAllocatedEditor';
import { BudgetRemainingEditor, BudgetRemainingSorter } from './editor/BudgetRemainingEditor';
import { BudgetUsedEditor, BudgetUsedSorter } from './editor/BudgetUsedEditor';
import { CheckboxEditor, CheckboxSorter } from './editor/CheckboxEditor';
import { CurrencyEditor, CurrencySorter } from './editor/CurrencyEditor';
import { DateEditor, DateSorter } from './editor/DateEditor';
import { EditorProps, EditorType, FieldProps } from './editor/EditorProps';
import { LabelEditor, LabelSorter } from './editor/LabelEditor';
import { LinkEditor, LinkSorter } from './editor/LinkEditor';
import { MemoEditor, MemoSorter } from './editor/MemoEditor';
import { NumberEditor, NumberSorter } from './editor/NumberEditor';
import { TagEditor, TagSorter } from './editor/TagEditor';
import { TextEditor, TextSorter } from './editor/TextEditor';
import { TransactionValueEditor, TransactionValueSorter } from './editor/TransactionValueEditor';
import VirtualTable, { ColumnDef } from './VirtualTableEditor';

import './TableEditor.less';
import { AccountTypeEditor, AccountTypeSorter } from './editor/AccountTypeEditor';
import { WithDataTestId } from './base/Common';

interface TableEditorProps<T extends IBaseEntity, Context> extends WithDataTestId {
  store: MappedStore<T>;
  schemaFilter?: (row: T) => boolean;
  factory: (id?: string) => T;
  creatable?: boolean;
  context?: Context;
}

type SortRow = (a: Row, b: Row, asc: boolean) => number;
type SortFn = <TEditorType extends IBaseEntity>(
  store: MappedStore<TEditorType>,
  field: keyof TEditorType,
  moneeeyStore: MoneeeyStore
) => false | SortRow;

const EditorTypeConfig: Record<
  EditorType,
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (pros: EditorProps<any, any, any>) => JSX.Element;
    sorter: SortFn;
    width: number | undefined;
  }
> = {
  [EditorType.TEXT]: {
    render: TextEditor,
    sorter: TextSorter,
    width: undefined,
  },
  [EditorType.NUMBER]: {
    render: NumberEditor,
    sorter: NumberSorter,
    width: undefined,
  },
  [EditorType.CHECKBOX]: {
    render: CheckboxEditor,
    sorter: CheckboxSorter,
    width: 100,
  },
  [EditorType.DATE]: {
    render: DateEditor,
    sorter: DateSorter,
    width: 142,
  },
  [EditorType.ACCOUNT]: {
    render: AccountEditor,
    sorter: AccountSorter,
    width: undefined,
  },
  [EditorType.ACCOUNT_TYPE]: {
    render: AccountTypeEditor,
    sorter: AccountTypeSorter,
    width: undefined,
  },
  [EditorType.CURRENCY]: {
    render: CurrencyEditor,
    sorter: CurrencySorter,
    width: undefined,
  },
  [EditorType.TAG]: {
    render: TagEditor,
    sorter: TagSorter,
    width: undefined,
  },
  [EditorType.MEMO]: {
    render: MemoEditor,
    sorter: MemoSorter,
    width: undefined,
  },
  [EditorType.TRANSACTION_VALUE]: {
    render: TransactionValueEditor,
    sorter: TransactionValueSorter,
    width: 320,
  },
  [EditorType.LABEL]: {
    render: LabelEditor,
    sorter: LabelSorter,
    width: undefined,
  },
  [EditorType.LINK]: {
    render: LinkEditor,
    sorter: LinkSorter,
    width: undefined,
  },
  [EditorType.BUDGET_REMAINING]: {
    render: BudgetRemainingEditor,
    sorter: BudgetRemainingSorter,
    width: undefined,
  },
  [EditorType.BUDGET_ALLOCATED]: {
    render: BudgetAllocatedEditor,
    sorter: BudgetAllocatedSorter,
    width: undefined,
  },
  [EditorType.BUDGET_USED]: {
    render: BudgetUsedEditor,
    sorter: BudgetUsedSorter,
    width: undefined,
  },
};

export type Row = {
  entityId: string;
};

export const TableEditor = observer(
  <T extends IBaseEntity>({ schemaFilter, store, factory, creatable, context }: TableEditorProps<T, unknown>) => {
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
                row.updated && dateDistanceInSecs(parseDateTime(row.updated), parseDateTime(currentDateTime())) < 20;
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

    const columns: ColumnDef<Row>[] = useMemo(
      () =>
        compact(values(store.schema()))
          .sort((a: FieldProps<never>, b: FieldProps<never>) => a.index - b.index)
          .map((props: FieldProps<never>) => {
            const config = EditorTypeConfig[props.editor];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
            const Editor = config.render as unknown as any;
            const sorter = config.sorter(store, props.field as keyof T, moneeeyStore);
            const { width } = config;

            return {
              width: width || props.width,
              title: props.title,
              fieldName: props.field,
              defaultSortOrder: props.defaultSortOrder,
              sorter,
              render: (_value: unknown, { entityId }: Row): React.ReactNode => {
                const key = `${entityId}_${props.field}`;
                const onUpdate = action((value: unknown, additional: object = {}) =>
                  store.merge({
                    ...(store.byUuid(entityId) || factory(entityId)),
                    [props.field]: value,
                    ...additional,
                  } as T)
                );

                return (
                  <Editor
                    {...{
                      store,
                      entityId,
                      key,
                      field: props,
                      onUpdate,
                      context,
                    }}
                  />
                );
              },
            };
          }) as ColumnDef<Row>[],
      [store]
    );

    return <VirtualTable className='tableEditor' columns={columns} rows={entities} />;
  }
);
