import { Typography } from 'antd';
import { useState } from 'react';

import { EditorProps } from './EditorProps';

export interface BaseEditorProps<EntityType, ValueEditorType, ValueEntityType> extends EditorProps<EntityType, ValueEditorType, ValueEntityType> {
  value: ValueEditorType;
  ComposedInput: any;
  ComposedProps: (onChange: (value: ValueEntityType, editorValue?: ValueEditorType) => void) => any;
}

export function BaseEditor<EntityType>({
  title,
  readOnly,
  validate,
  ComposedInput,
  ComposedProps,
  onUpdate,
  value
}: BaseEditorProps<EntityType, any, any>) {
  const [currentValue, setCurrentValue] = useState(value);
  const [error, setError] = useState('');
  const onChange = (value: any, editorValue?: any) => {
    console.log('onChange', { value, editorValue })
    setCurrentValue(editorValue || value);
    setError('');
    if (validate) {
      const { valid, error } = validate(value);
      if (!valid) {
        setError(error || '');
        return;
      }
    }
    onUpdate && onUpdate(value);
  };
  return (
    <label>
      <ComposedInput
        {...{
          readOnly,
          status: !!error ? 'error' : undefined,
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
