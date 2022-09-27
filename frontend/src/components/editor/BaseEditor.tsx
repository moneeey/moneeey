import { Typography } from 'antd'
import { useEffect, useState } from 'react'

import { IBaseEntity } from '../../shared/Entity'

import { EditorProps } from './EditorProps'

import './BaseEditor.less'

type OnChange<EntityType, ValueEditorType, ValueEntityType> = (
  value?: ValueEntityType,
  editorValue?: ValueEditorType,
  additional?: Partial<EntityType>
) => void

export interface BaseEditorProps<EntityType extends IBaseEntity, ValueEditorType, ValueEntityType>
  extends EditorProps<EntityType, ValueEditorType, ValueEntityType> {
  value: ValueEditorType
  rev: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComposedInput: any
  ComposedProps: (onChange: OnChange<EntityType, ValueEditorType, ValueEntityType>) => object
}

export const BaseEditor = function <EntityType extends IBaseEntity, ValueEditorType, ValueEntityType>({
  ComposedInput,
  ComposedProps,
  value,
  rev,
  onUpdate,
  field: { title, readOnly, validate },
}: BaseEditorProps<EntityType, ValueEditorType, ValueEntityType>) {
  const [currentValue, setCurrentValue] = useState(value)
  const [error, setError] = useState('')
  const onChange = (entityValue?: ValueEntityType, editorValue?: ValueEditorType, additional: object = {}) => {
    const newValue = (editorValue || entityValue) as ValueEditorType
    setCurrentValue(newValue)
    setError('')
    if (validate) {
      const { valid, error: newError } = validate(newValue)
      if (!valid) {
        setError(newError || '')

        return
      }
    }
    if (onUpdate) {
      onUpdate((entityValue || editorValue) as unknown as ValueEntityType, additional)
    }
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
          value: currentValue,
        }}
      />
      {error && (
        <Typography.Text className='baseEditor-error' type='danger'>
          {error}
        </Typography.Text>
      )}
    </label>
  )
}
