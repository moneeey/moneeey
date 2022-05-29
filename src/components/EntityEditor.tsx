import { DatePicker, Input, InputNumber, Select, Table, Typography } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { cloneElement, ReactElement, useState } from 'react';

import { IAccount } from '../shared/Account';
import { ICurrency } from '../shared/Currency';
import { formatDate } from '../shared/Date';

interface validation {
  valid: boolean;
  error?: string;
}

interface EditorProps {
  field: string;
  title: string;
  readOnly?: boolean;
  required?: boolean;
  validate?: (value: any) => validation;
  value?: any;
  entity?: any;
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
  ComposedProps
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

function TextEditor(props: EditorProps) {
  const editor = BaseEditor({
    ...props,
    ComposedInput: Input,
    ComposedProps: {
      onChange: ({ target: { value } }: any) => editor.onChange(value)
    }
  });
  return editor.element;
}

function DateEditor(props: EditorProps) {
  const editor = BaseEditor({
    ...props,
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
    ComposedInput: InputNumber,
    ComposedProps: {
      onChange: (value: number | null) => editor.onChange(value)
    }
  });
  return editor.element;
}

interface BaseSelectorEditorProps extends BaseEditorProps {
  options: Array<{
    title: string;
    value: any;
  }>;
}

function BaseSelectEditor(props: BaseSelectorEditorProps) {
  const editor = BaseEditor({
    ...props,
    ComposedProps: {
      ...props.ComposedProps,
      options: props.options,
      onSelect: (value: string) => editor.onChange(value)
    }
  });
  return editor;
}

interface CurrencyEditorProps extends EditorProps {
  currencies: ICurrency[];
}
function CurrencyEditor(props: CurrencyEditorProps) {
  const editor = BaseSelectEditor({
    ...props,
    options: _(props.currencies)
      .map((currency) => currency._id && { title: currency.name, value: currency._id })
      .compact()
      .value(),
    ComposedProps: {},
    ComposedInput: Select,
  });
  return editor.element;
}

interface AccountEditorProps extends EditorProps {
  accounts: IAccount[];
}
function AccountEditor(props: AccountEditorProps) {
  const editor = BaseSelectEditor({
    ...props,
    options: _(props.accounts)
      .map((account) => account._id && { title: account.name, value: account._id })
      .compact()
      .value(),
    ComposedProps: {},
    ComposedInput: Select,
  });
  return editor.element;
}

interface EntityEditorProps<T> {
  entities: T[];
  children: ReactElement[];
}
function EntityEditor<T>({ entities, children }: EntityEditorProps<T>) {
  const columns = _(children)
    .compact()
    .map((child) => ({ props: child.props as EditorProps, child }))
    .map(({ props, child }) => ({
      title: props.title,
      dataIndex: props.field,
      render: (value: string, entity: object) => cloneElement(child, { ...child.props, entity, value }),
      sort: true
    }))
    .value();
  return (
    <Table
      className='entityEditor'
      columns={columns}
      dataSource={[...(entities as unknown as object[]), {}]}
      pagination={false}
    />
  );
}

export { EntityEditor, TextEditor, CurrencyEditor, DateEditor, NumberEditor, AccountEditor };
