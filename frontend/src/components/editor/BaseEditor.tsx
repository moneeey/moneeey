import { Typography } from 'antd'
import { useEffect, useState } from 'react'

import { EditorProps } from './EditorProps'

type OnChange<EntityType, ValueEditorType, ValueEntityType> = (value?: ValueEntityType, editorValue?: ValueEditorType, additional?: Partial<EntityType>) => void

export interface BaseEditorProps<EntityType, ValueEditorType, ValueEntityType> extends EditorProps<EntityType, ValueEditorType, ValueEntityType> {
  value: ValueEditorType;
  rev: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComposedInput: any;
  ComposedProps: (onChange: OnChange<EntityType, ValueEditorType, ValueEntityType>) => object;
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
  const onChange = (entityValue?: ValueEntityType, editorValue?: ValueEditorType, additional: object = {}) => {
    const newValue = (editorValue || entityValue) as ValueEditorType
    setCurrentValue(newValue)
    setError('')
    if (validate) {
      const { valid, error } = validate(newValue)
      if (!valid) {
        setError(error || '')
        return
      }
    }
    onUpdate && onUpdate((entityValue || editorValue) as unknown as ValueEntityType, additional)
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
        <Typography.Text className='tableEditor-feedback' type='danger'>
          {error}
        </Typography.Text>
      )}
    </label>
  )
}
