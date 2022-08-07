import { Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import _ from 'lodash';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';

import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import { AccountEditor } from './AccountEditor';
import { CurrencyEditor } from './CurrencyEditor';
import { DateEditor } from './DateEditor';
import { EditorPropsType, EditorType } from './EditorProps';
import { NumberEditor } from './NumberEditor';
import { TagEditor } from './TagEditor';
import { TextEditor } from './TextEditor';

interface EntityEditorProps<T extends IBaseEntity, SchemaProps> {
  entities: T[];
  schemaProps: SchemaProps;
  store: MappedStore<T, SchemaProps>;
}

const EditorTypeToEditor = {
  [EditorType.TEXT]: TextEditor,
  [EditorType.NUMBER]: NumberEditor,
  [EditorType.DATE]: DateEditor,
  [EditorType.ACCOUNT]: AccountEditor,
  [EditorType.CURRENCY]: CurrencyEditor,
  [EditorType.TAG]: TagEditor
};

export const EntityEditor = observer(
  <T extends IBaseEntity, SchemaProps>({ entities, store, schemaProps }: EntityEditorProps<T, SchemaProps>) => {
    const columns: ColumnType<any>[] = _(store.schema(schemaProps))
      .values()
      .compact()
      .sort((a, b) => a.index - b.index)
      .map(
        (props: EditorPropsType<any>): ColumnType<any> => ({
          title: props.title,
          dataIndex: props.field,
          sorter: true,
          render: (value: string, entityId: string) => {
            const Editor = EditorTypeToEditor[props.editor] as any;
            return (
              <Editor
                {...{
                  ...props,
                  ...schemaProps,
                  value,
                  store,
                  entityId,
                  onUpdate: action((value: any) =>
                    store.merge({
                      ...(store.byUuid(entityId) || store.factory(schemaProps)),
                      [props.field]: value
                    } as T)
                  )
                }}
              />
            );
          }
        })
      )
      .value() as ColumnType<any>[];
    return (
      <Table
        rowKey='_id'
        className='entityEditor'
        columns={columns}
        dataSource={[...entities.map((entity) => store.getUuid(entity)), 'new']}
        pagination={false}
      />
    );
  }
);
