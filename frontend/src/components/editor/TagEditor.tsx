import { Select } from 'antd';
import _, { compact, flatten, flattenDeep } from 'lodash';
import { observer } from 'mobx-react';

import { BaseSelectEditor } from './BaseSelectEditor';
import { EditorProps } from './EditorProps';

export interface TagEditorProps<EntityType> extends EditorProps<EntityType, string[], string[]> {
  tags: string[];
}

export const TagEditor = observer(<EntityType,>(props: TagEditorProps<EntityType>) => {
  const entity = props.store.byUuid(props.entityId)
  const currentValue = entity?.[props.field.field]
  return (
    <BaseSelectEditor
      {...{
        ...props,
        value: currentValue,
        rev: entity?._rev,
        options: _(props.tags)
          .map((tag) => ({ label: tag, value: tag }))
          .compact()
          .value(),
        ComposedProps: (onChange) => ({
          onChange: (value: string[]) => onChange(flattenDeep([value])),
          onSelect: (value: string) => onChange(flattenDeep([[value], [currentValue]])),
          mode: 'tags',
        }),
        ComposedInput: Select
      }}
    />
  );
});
