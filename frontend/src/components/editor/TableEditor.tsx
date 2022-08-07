import { Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import _ from 'lodash';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';

import { EntityType, IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import { uuid } from '../../shared/Utils';
import { AccountEditor } from './AccountEditor';
import { CurrencyEditor } from './CurrencyEditor';
import { DateEditor } from './DateEditor';
import { EditorProps, EditorType, FieldProps } from './EditorProps';
import { NumberEditor } from './NumberEditor';
import { TagEditor } from './TagEditor';
import { TextEditor, TextEditorProps } from './TextEditor';

interface EntityEditorProps<T extends IBaseEntity, SchemaProps> {
  schemaProps: SchemaProps;
  store: MappedStore<T, SchemaProps>;
  schemaFilter?: (schema: SchemaProps, row: T) => boolean;
}

interface EntityRow {
  entityId: string;
  rev: string;
}


const EditorTypeToEditor = {
  [EditorType.TEXT]: TextEditor,
  [EditorType.NUMBER]: NumberEditor,
  [EditorType.DATE]: DateEditor,
  [EditorType.ACCOUNT]: AccountEditor,
  [EditorType.CURRENCY]: CurrencyEditor,
  [EditorType.TAG]: TagEditor
};

export const TableEditor = observer(
  <T extends IBaseEntity, SchemaProps>({ schemaFilter, store, schemaProps }: EntityEditorProps<T, SchemaProps>) => {

const entities: EntityRow[] = store.all
  .filter(row => !schemaFilter || schemaFilter(schemaProps, row))
  .map(entity => ({ entityId: store.getUuid(entity), rev: entity._rev || '0' }))
  .concat({ entityId: 'new', rev: '0' });

const columns: ColumnType<EntityRow>[] = _(store.schema(schemaProps))
  .values()
  .compact()
  .sort((a, b) => a.index - b.index)
  .map(<FieldEntityType, ValueEditorType, ValueEntityType>(props: FieldProps<FieldEntityType, ValueEditorType, ValueEntityType>): ColumnType<EntityRow> => ({
      title: props.title,
      dataIndex: props.field,
      sorter: true,
      render: (_value: any, { entityId, rev }: EntityRow): React.ReactNode => {
        const Editor = EditorTypeToEditor[props.editor] as unknown as any;

        const onUpdate = action((value: any) =>
                store.merge({
                  ...(store.byUuid(entityId) || store.factory(schemaProps)),
                  [props.field]: value
                } as T)
              )
        
        const rowProps: TextEditorProps<EntityType> = {
          store,
          entityId,
          rev,
          field: props as unknown as any,
        }

        return (
          <Editor
            {...{
              ...schemaProps,
              ...rowProps,
              key: entityId + '_' + props.field,
              onUpdate
            }}
          />
        );
      }
    })
  )
  .value() as ColumnType<any>[];
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
