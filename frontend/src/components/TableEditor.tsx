import { Table } from 'antd'
import { ColumnType } from 'antd/lib/table'
import { compact, values } from 'lodash'
import { action } from 'mobx'
import { observer } from 'mobx-react'
import React, { useMemo } from 'react'
import { IBaseEntity } from '../shared/Entity'
import MappedStore from '../shared/MappedStore'
import MoneeeyStore from '../shared/MoneeeyStore'
import useMoneeeyStore from '../shared/useMoneeeyStore'
import { AccountEditor, AccountSorter } from './editor/AccountEditor'
import { CurrencyEditor, CurrencySorter } from './editor/CurrencyEditor'
import { DateEditor, DateSorter } from './editor/DateEditor'
import { EditorProps, EditorType, FieldProps } from './editor/EditorProps'
import { MemoEditor } from './editor/MemoEditor'
import { NumberEditor, NumberSorter } from './editor/NumberEditor'
import { TagEditor } from './editor/TagEditor'
import { TextEditor, TextSorter } from './editor/TextEditor'
import { TransactionValueEditor, TransactionValueSorter } from './editor/TransactionValueEditor'

interface TableEditorProps<T extends IBaseEntity> {
  store: MappedStore<T>;
  schemaFilter?: (row: T) => boolean;
  factory: () => T;
}

const EditorTypeToEditor: Record<EditorType, (pros: EditorProps<unknown, unknown, unknown>) => JSX.Element> = {
  [EditorType.TEXT]: TextEditor,
  [EditorType.NUMBER]: NumberEditor,
  [EditorType.DATE]: DateEditor,
  [EditorType.ACCOUNT]: AccountEditor,
  [EditorType.CURRENCY]: CurrencyEditor,
  [EditorType.TAG]: TagEditor,
  [EditorType.MEMO]: MemoEditor,
  [EditorType.TRANSACTION_VALUE]: TransactionValueEditor,
}

type SortRow = (a: Row, b: Row, asc: boolean) => number
type SortFn = <TEditorType extends IBaseEntity>(store: MappedStore<TEditorType>, field: keyof TEditorType, moneeeyStore: MoneeeyStore) => false | SortRow

const EditorTypeToSorter: Record<EditorType, SortFn> = {
  [EditorType.TEXT]: TextSorter,
  [EditorType.NUMBER]: NumberSorter,
  [EditorType.DATE]: DateSorter,
  [EditorType.ACCOUNT]: AccountSorter,
  [EditorType.CURRENCY]: CurrencySorter,
  [EditorType.TAG]: () => false,
  [EditorType.MEMO]: TextSorter,
  [EditorType.TRANSACTION_VALUE]: TransactionValueSorter,
}

const EditorTypeToWidth: Record<EditorType, number | undefined> = {
  [EditorType.DATE]: 115,
  [EditorType.TRANSACTION_VALUE]: 250,
  [EditorType.TEXT]: undefined,
  [EditorType.NUMBER]: undefined,
  [EditorType.ACCOUNT]: undefined,
  [EditorType.CURRENCY]: undefined,
  [EditorType.TAG]: undefined,
  [EditorType.MEMO]: undefined,
}


export type Row = {
  entityId: string;
}

export const TableEditor = observer(
  <T extends IBaseEntity>({ schemaFilter, store, factory }: TableEditorProps<T>) => {

    const moneeeyStore = useMoneeeyStore()

    const entities = useMemo(() => store.ids
      .map(id => store.byUuid(id) as T)
      .filter(row => !schemaFilter || schemaFilter(row))
      .map(row => store.getUuid(row))
      .concat('new')
      .map(entityId => ({ entityId })), [store, store.ids, schemaFilter])

    const columns: ColumnType<Row>[] = useMemo(() => compact(values(store.schema()))
      .sort((a: FieldProps<never>, b: FieldProps<never>) => a.index - b.index)
      .map((props: FieldProps<never>): ColumnType<Row> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Editor = EditorTypeToEditor[props.editor] as unknown as any
        const sorter = EditorTypeToSorter[props.editor](store, props.field as keyof T, moneeeyStore)
        const width = EditorTypeToWidth[props.editor]
        return {
          width: width || props.width,
          title: props.title,
          dataIndex: props.field,
          defaultSortOrder: props.defaultSortOrder,
          sorter: sorter ? (a, b, sortOrder) => sorter(a, b, sortOrder === 'ascend') : undefined,
          render: (_value: unknown, { entityId }: Row): React.ReactNode => {
            const key = entityId + '_' + props.field
            const onUpdate = action((value: unknown, additional: object = {}) =>
              store.merge({
                ...(store.byUuid(entityId) || factory()),
                [props.field]: value,
                ...additional
              } as T)
            )

            return <Editor {...{ store, entityId, key, field: props, onUpdate }} />
          }
        }
      }), [store])

    return (
      <Table
        rowKey='entityId'
        className='tableEditor'
        columns={columns}
        dataSource={entities}
        pagination={false}
      />
    )
  }
)
