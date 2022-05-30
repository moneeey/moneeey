import { DatePicker, Input, InputNumber, Select, Table, Typography } from 'antd';
import { ColumnType } from 'antd/lib/table';
import _ from 'lodash';
import { observer } from 'mobx-react';
import moment from 'moment';
import { cloneElement, ReactElement, useState } from 'react';

import { IAccount } from '../shared/Account';
import { ICurrency } from '../shared/Currency';
import { formatDate } from '../shared/Date';
import { IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';

interface validation {
  valid: boolean;
  error?: string;
}

export interface EditorProps {
  field: string;
  title: string;
  index: number;
  renderer: any;
  readOnly?: boolean;
  required?: boolean;
  validate?: (value: any) => validation;
  value?: any;
  entity?: any;
  onSave?: (value: any) => void;
}

interface BaseEditorProps extends EditorProps {
  ComposedInput: any;
  ComposedProps: any;
}

function BaseEditor({
  field,
  title,
  readOnly,
  validate,
  value,
  entity,
  ComposedInput,
  ComposedProps,
  onSave
}: BaseEditorProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [error, setError] = useState('');
  const onChange = (value: any, editorValue?: any) => {
    setCurrentValue(editorValue || value);
    setError('');
    if (validate) {
      const { valid, error } = validate(value);
      if (!valid) {
        setError(error || '');
        return;
      }
    }
    entity[field] = value;
    onSave && onSave(entity);
  };
  return {
    onChange,
    element: (
      <label>
        <ComposedInput {...{ readOnly, title, placeholder: title, value: currentValue, ...ComposedProps }} />
        {error && <Typography.Text type='danger'>{error}</Typography.Text>}
      </label>
    )
  };
}

const TextEditor = observer((props: EditorProps) => {
  const editor = BaseEditor({
    ...props,
    value: props.entity[props.field],
    ComposedInput: Input,
    ComposedProps: {
      onChange: ({ target: { value } }: any) => editor.onChange(value)
    }
  });
  return editor.element;
})

function DateEditor(props: EditorProps) {
  const editor = BaseEditor({
    ...props,
    value: (props.value && moment(props.value)) || moment(),
    ComposedInput: DatePicker,
    ComposedProps: {
      onSelect: (value: moment.Moment) => editor.onChange(formatDate(value.toDate()), value)
    }
  });
  return editor.element;
}

function NumberEditor(props: EditorProps) {
  const editor = BaseEditor({
    ...props,
    value: props.entity[props.field],
    ComposedInput: InputNumber,
    ComposedProps: {
      onChange: (value: number | null) => editor.onChange(value)
    }
  });
  return editor.element;
}

interface BaseSelectorEditorProps extends BaseEditorProps {
  options: Array<{
    label: string;
    value: any;
  }>;
}

function BaseSelectEditor(props: BaseSelectorEditorProps) {
  const editor = BaseEditor({
    ...props,
    value: props.entity[props.field],
    ComposedProps: {
      ...props.ComposedProps,
      options: props.options,
      onSelect: (value: string) => editor.onChange(value)
    }
  });
  return editor;
}

export interface CurrencyEditorProps extends EditorProps {
  currencies: ICurrency[];
}
function CurrencyEditor(props: CurrencyEditorProps) {
  const editor = BaseSelectEditor({
    ...props,
    value: props.entity[props.field],
    options: _(props.currencies)
      .map((currency) => ({ label: currency.name, value: currency._id }))
      .value(),
    ComposedProps: {},
    ComposedInput: Select
  });
  return editor.element;
}

export interface AccountEditorProps extends EditorProps {
  accounts: IAccount[];
}
function AccountEditor(props: AccountEditorProps) {
  const editor = BaseSelectEditor({
    ...props,
    value: props.entity[props.field],
    options: _(props.accounts)
      .map((account) => ({ label: account.name, value: account._id }))
      .compact()
      .value(),
    ComposedProps: {},
    ComposedInput: Select
  });
  return editor.element;
}

interface EntityEditorProps<T extends IBaseEntity, SchemaProps> {
  entities: T[];
  schemaProps: SchemaProps;
  store: MappedStore<T, SchemaProps>;
}

const EntityEditor = observer(<T extends IBaseEntity, SchemaProps>({ entities, store, schemaProps }: EntityEditorProps<T, SchemaProps>) => {
  const columns = _(store.schema(schemaProps))
    .values()
    .compact()
    .sort((a, b) => a.index - b.index)
    .map((props: EditorProps) => ({
      title: props.title,
      dataIndex: props.field,
      sort: true,
      render: (value: string, entity: object) => <props.renderer { ...{...props, entity, onSave: (entity: T) => store.merge(entity) }} />,
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

export { EntityEditor, TextEditor, CurrencyEditor, DateEditor, NumberEditor, AccountEditor };
