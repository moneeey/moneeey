import { compact, flatten } from 'lodash';
import { BaseEditor, BaseEditorProps } from './BaseEditor';

interface BaseSelectEditorProps<EntityType, ValueEditorType, ValueEntityType> extends BaseEditorProps<EntityType, ValueEditorType, ValueEntityType> {
  options: Array<{
    label: string;
    value: ValueEditorType;
  }>;
}

export function BaseSelectEditor<EntityType>(props: BaseSelectEditorProps<EntityType, any, any>) {
  return (
    <BaseEditor
      {...{
        ...props,
        ComposedProps: (onChange) => ({
          options: props.options,
          onSelect: (value: string) => onChange(value),
          ...props.ComposedProps(onChange),
        })
      }}
    />
  );
}
