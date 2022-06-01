import { Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import _ from 'lodash';
import { observer } from 'mobx-react';

import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import { AccountEditor } from './AccountEditor';
import { CurrencyEditor } from './CurrencyEditor';
import { DateEditor } from './DateEditor';
import { EditorProps, EditorType } from './EditorProps';
import { NumberEditor } from './NumberEditor';
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
}

export const EntityEditor = observer(<T extends IBaseEntity, SchemaProps>({ entities, store, schemaProps }: EntityEditorProps<T, SchemaProps>) => {
  const columns = _(store.schema(schemaProps))
    .values()
    .compact()
    .sort((a, b) => a.index - b.index)
    .map((props: EditorProps<any, any, any>) => ({
      title: props.title,
      dataIndex: props.field,
      sort: true,
      render: (value: string, entity: object) => {
        const Editor = EditorTypeToEditor[props.editor] as any
        return <Editor { ...{...props, ...schemaProps,
          entity,
          onSave: (entity: T) => store.merge(entity),
          onUpdate: (entity: T, value: any) => (entity as any)[props.field] = value,
        }} />
      },
    } as ColumnType<T>))
    .value();
  return (
    <Table
      className='entityEditor'
      columns={columns as ColumnType<T>[]}
      dataSource={[...entities , store.factory(schemaProps)]}
      pagination={false}
    />
  );
})
