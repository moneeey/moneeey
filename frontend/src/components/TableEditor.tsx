import { Table } from 'antd'
import { ColumnType } from 'antd/lib/table'
import _ from 'lodash'
import { action } from 'mobx'
import { observer } from 'mobx-react'
import React, { useMemo } from 'react'
import { IBaseEntity } from '../shared/Entity'
import MappedStore from '../shared/MappedStore'
import { AccountEditor } from './editor/AccountEditor'
import { CurrencyEditor } from './editor/CurrencyEditor'
import { DateEditor } from './editor/DateEditor'
import { EditorType, FieldProps } from './editor/EditorProps'
import { MemoEditor } from './editor/MemoEditor'
import { NumberEditor } from './editor/NumberEditor'
import { TagEditor } from './editor/TagEditor'
import { TextEditor } from './editor/TextEditor'
import { TransactionValueEditor } from './editor/TransactionValueEditor'

interface EntityEditorProps<T extends IBaseEntity, SchemaProps> {
  schemaProps: SchemaProps;
  store: MappedStore<T, SchemaProps>;
  schemaFilter?: (schema: SchemaProps, row: T) => boolean;
}

const EditorTypeToEditor = {
  [EditorType.TEXT]: TextEditor,
  [EditorType.NUMBER]: NumberEditor,
  [EditorType.DATE]: DateEditor,
  [EditorType.ACCOUNT]: AccountEditor,
  [EditorType.CURRENCY]: CurrencyEditor,
  [EditorType.TAG]: TagEditor,
  [EditorType.MEMO]: MemoEditor,
  [EditorType.TRANSACTION_VALUE]: TransactionValueEditor,
}

type Row = {
  entityId: string;
}

export const TableEditor = observer(
  <T extends IBaseEntity, SchemaProps>({ schemaFilter, store, schemaProps }: EntityEditorProps<T, SchemaProps>) => {

    const entities = useMemo(() => store.ids
      .map(id => store.byUuid(id) as T)
      .filter(row => !schemaFilter || schemaFilter(schemaProps, row))
      .map(row => store.getUuid(row))
      .concat('new')
      .map(entityId => ({ entityId })),
    [store.ids])

    const columns: ColumnType<Row>[] = useMemo(() => _(store.schema(schemaProps))
      .values()
      .compact()
      .sort((a: FieldProps<unknown>, b: FieldProps<unknown>) => a.index - b.index)
      .map((props: FieldProps<unknown>): ColumnType<Row> => ({
        title: props.title,
        dataIndex: props.field,
        sorter: true,
        // sorter: EditorTypeToSorter[props.editor],
        render: (_value: unknown, { entityId }: Row): React.ReactNode => {
          const onUpdate = action((value: unknown, additional: object = {}) =>
            store.merge({
              ...(store.byUuid(entityId) || store.factory(schemaProps)),
              [props.field]: value,
              ...additional
            } as T)
          )

          const key = entityId + '_' + props.field

          const Editor = EditorTypeToEditor[props.editor]
          return <Editor {...{ ...schemaProps, store, entityId, key, field: props, onUpdate }} />
        }
      })
      )
      .value()
    , [schemaProps])

    return (
      <Table
        rowKey='entityId'
        className='entityEditor'
        columns={columns}
        dataSource={entities}
        pagination={false}
      />
    )
  }
)
