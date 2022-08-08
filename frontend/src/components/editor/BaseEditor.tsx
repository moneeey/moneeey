import { Typography } from 'antd';
import { useEffect, useState } from 'react';

import { EditorProps } from './EditorProps';

type OnChange<ValueEditorType, ValueEntityType> = (value: ValueEntityType, editorValue?: ValueEditorType, additional?: any) => void

export interface BaseEditorProps<EntityType, ValueEditorType, ValueEntityType> extends EditorProps<EntityType, ValueEditorType, ValueEntityType> {
  value: ValueEditorType;
  rev: string;
  ComposedInput: any;
  ComposedProps: (onChange: OnChange<ValueEditorType, ValueEntityType>) => any;
}

export function BaseEditor<EntityType>({
  ComposedInput,
  ComposedProps,
  value,
  rev,
  onUpdate,
  field: {
    field,
    title,
    readOnly,
    validate,
  },
}: BaseEditorProps<EntityType, any, any>) {
  const [currentValue, setCurrentValue] = useState(value);
  const [error, setError] = useState('');
  const onChange = (value: any, editorValue?: any, additional?: any) => {
    setCurrentValue(editorValue || value);
    setError('');
    if (validate) {
      const { valid, error } = validate(value);
      if (!valid) {
        setError(error || '');
        return;
      }
    }
    onUpdate && onUpdate(value, additional);
  };
  useEffect(() => {
    setCurrentValue(value)
  }, [setCurrentValue, value])

  const status = !!error ? 'error' : undefined

  return (
    <label>
      <ComposedInput
        {...{
          readOnly,
          rev,
          status,
          title,
          placeholder: title,
          ...ComposedProps(onChange),
          value: currentValue
        }}
      />
      {error && (
        <Typography.Text className='entityEditor-feedback' type='danger'>
          {error}
        </Typography.Text>
      )}
    </label>
  );
}
