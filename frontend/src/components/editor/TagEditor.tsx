import { Select } from 'antd';
import _, { flatten } from 'lodash';
import { observer } from 'mobx-react';

import { BaseSelectEditor } from './BaseSelectEditor';
import { EditorProps } from './EditorProps';

export interface TagEditorProps<EntityType> extends EditorProps<EntityType, string[], string[]> {
  tags: string[];
}

export const TagEditor = observer(<EntityType,>(props: TagEditorProps<EntityType>) => {
  const entity = props.store.byUuid(props.entityId)
  return (
    <BaseSelectEditor
      {...{
        ...props,
        value: entity?.[props.field.field],
        rev: entity?._rev,
        options: _(props.tags)
          .map((tag) => ({ label: tag, value: tag }))
          .compact()
          .value(),
        ComposedProps: (onChange) => ({
          onSelect: () => {},
          onChange: (value: string) => onChange(value, flatten([value])),
          mode: 'tags'
        }),
        ComposedInput: Select
      }}
    />
  );
});
