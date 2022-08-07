import { Select } from 'antd';
import _, { flatten } from 'lodash';
import { observer } from 'mobx-react';

import { BaseSelectEditor } from './BaseSelectEditor';
import { TagEditorProps } from './EditorProps';

export const TagEditor = observer(<EntityType,>(props: TagEditorProps<EntityType>) => {
  return (
    <BaseSelectEditor
      {...{
        ...props,
        value: props.store.byUuid(props.entityId)?.[props.field],
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
