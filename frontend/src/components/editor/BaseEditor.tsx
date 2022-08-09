import { Typography } from 'antd'
import { useEffect, useState } from 'react'

import { EditorProps } from './EditorProps'

type OnChange<ValueEditorType, ValueEntityType> = (value: ValueEntityType, editorValue?: ValueEditorType, additional?: object) => void

export interface BaseEditorProps<EntityType, ValueEditorType, ValueEntityType> extends EditorProps<EntityType, ValueEditorType, ValueEntityType> {
  value: ValueEditorType;
  rev: string;
  ComposedInput: any;
  ComposedProps: (onChange: OnChange<ValueEditorType, ValueEntityType>) => object;
}

export function BaseEditor<EntityType, ValueEditorType, ValueEntityType>({
  ComposedInput,
  ComposedProps,
  value,
  rev,
  onUpdate,
  field: {
    title,
    readOnly,
    validate,
  },
}: BaseEditorProps<EntityType, ValueEditorType, ValueEntityType>) {
  const [currentValue, setCurrentValue] = useState(value)
  const [error, setError] = useState('')
  const onChange = (value: ValueEntityType, editorValue?: ValueEditorType, additional: object = {}) => {
    const newValue = (editorValue || value) as ValueEditorType
    setCurrentValue(newValue)
    setError('')
    if (validate) {
      const { valid, error } = validate(newValue)
      if (!valid) {
        setError(error || '')
        return
      }
    }
    onUpdate && onUpdate(value, additional)
  }
  useEffect(() => {
    setCurrentValue(value)
  }, [setCurrentValue, value])

  const status = error ? 'error' : undefined

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
  )
}
