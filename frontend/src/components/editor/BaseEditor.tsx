import { useEffect, useState } from 'react';

import { IBaseEntity } from '../../shared/Entity';
import { TextDanger } from '../base/Text';
import { WithDataTestId } from '../base/Common';

import { EditorProps } from './EditorProps';

import './BaseEditor.less';

type OnChange<EntityType, ValueEditorType, ValueEntityType> = (
  value?: ValueEntityType,
  editorValue?: ValueEditorType,
  additional?: Partial<EntityType>
) => void;

type BaseProps<ValueEditorType> = WithDataTestId & {
  readOnly: boolean;
  placeholder: string;
  value: ValueEditorType;
};

export interface BaseEditorProps<EntityType extends IBaseEntity, ValueEditorType, ValueEntityType>
  extends EditorProps<EntityType, ValueEditorType, ValueEntityType> {
  value: ValueEditorType;
  rev: string;
  Composed: (
    baseProps: BaseProps<ValueEditorType>,
    onChange: OnChange<EntityType, ValueEditorType, ValueEntityType>
  ) => JSX.Element;
}

export const BaseEditor = function <EntityType extends IBaseEntity, ValueEditorType, ValueEntityType>({
  Composed,
  value,
  rev,
  onUpdate,
  field: { title, readOnly, validate },
}: BaseEditorProps<EntityType, ValueEditorType, ValueEntityType>) {
  const [currentValue, setCurrentValue] = useState(value);
  const [error, setError] = useState('');
  const onChange = (entityValue?: ValueEntityType, editorValue?: ValueEditorType, additional: object = {}) => {
    const newValue = (editorValue || entityValue) as ValueEditorType;
    setCurrentValue(newValue);
    setError('');
    if (validate) {
      const { valid, error: newError } = validate(newValue);
      if (!valid) {
        setError(newError || '');

        return;
      }
    }
    if (onUpdate) {
      onUpdate((entityValue || editorValue) as unknown as ValueEntityType, additional);
    }
  };
  useEffect(() => {
    setCurrentValue(value);
  }, [setCurrentValue, value]);

  return (
    <label>
      {Composed(
        {
          'data-test-id': `editor${(title || '').replace(' ', '_')}_${rev}`,
          readOnly: Boolean(readOnly),
          placeholder: title || '',
          value: currentValue,
        },
        onChange
      )}
      {error && <TextDanger className='baseEditor-error'>{error}</TextDanger>}
    </label>
  );
};
