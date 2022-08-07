import { Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import _ from 'lodash';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useMemo } from 'react';

import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import { AccountEditor } from './AccountEditor';
import { CurrencyEditor } from './CurrencyEditor';
import { DateEditor } from './DateEditor';
import { EditorType, FieldProps } from './EditorProps';
import { NumberEditor } from './NumberEditor';
import { TagEditor } from './TagEditor';
import { TextEditor } from './TextEditor';

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
  [EditorType.TAG]: TagEditor
};

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
      .sort((a, b) => a.index - b.index)
      .map((props: FieldProps<any, any, any>): ColumnType<Row> => ({
        title: props.title,
        dataIndex: props.field,
        sorter: true,
        render: (_value: any, { entityId }: Row): React.ReactNode => {
          const Editor = EditorTypeToEditor[props.editor] as unknown as any;

          const onUpdate = action((value: any) =>
            store.merge({
              ...(store.byUuid(entityId) || store.factory(schemaProps)),
              [props.field]: value
            } as T)
          )

          const key = entityId + '_' + props.field
          const field = props as unknown as any

          return <Editor {...{ ...schemaProps, store, entityId, key, field, onUpdate }} />
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
    );
  }
);
