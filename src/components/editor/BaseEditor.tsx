import { Typography } from 'antd';
import { useState } from 'react';

import { EditorProps } from './EditorProps';

export interface BaseEditorProps<EntityType> extends EditorProps<EntityType, any, any> {
  ComposedInput: any;
  ComposedProps: any;
}

export function BaseEditor<EntityType>({
  title, readOnly, validate, entity, ComposedInput, ComposedProps, onSave, onUpdate,
}: BaseEditorProps<EntityType>) {
  const [currentValue, setCurrentValue] = useState(ComposedProps.value);
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
    if (entity) {
      onUpdate && onUpdate(entity, value)
      onSave && onSave(entity);
    }
  };
  return {
    onChange,
    element: (
      <label>
        <ComposedInput {...{ readOnly, status: !!error ? 'error' : undefined, title, placeholder: title, ...ComposedProps, value: currentValue }} />
        {error && <Typography.Text className="entityEditor-feedback" type='danger'>{error}</Typography.Text>}
      </label>
    )
  };
}
