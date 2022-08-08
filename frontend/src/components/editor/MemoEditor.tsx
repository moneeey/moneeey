import { DatePicker, Input } from 'antd';
import { observer } from 'mobx-react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import useMoneeeyStore from '../../shared/useMoneeeyStore';

import { formatDate, TDate } from '../../utils/Date';
import { TagsMemo } from '../Tags';
import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';

export interface MemoEditorProps<EntityType> extends EditorProps<EntityType, string, string> {
}

export const MemoEditor = observer(<EntityType,>(props: MemoEditorProps<EntityType>) => {
  const entity = props.store.byUuid(props.entityId)
  const value = entity?.[props.field.field]
  const [currentValue, setCurrentValue] = useState('')
  const memo = (currentValue || value || '');
  const tags = Array.from(memo.matchAll(/[^#](#\w+)/g))
    .map((m: any) => m[1].replace('#', ''));

  return (
    <BaseEditor
      {...{
        ...props,
        value: memo.replace('##', '#'),
        rev: entity?._rev,
        ComposedInput: Input,
        ComposedProps: (onChange) => ({
          onChange: ({ target: { value } }: any) => {
            setCurrentValue(value)
            return onChange(value, value, { tags })
          },
          addonAfter: <TagsMemo tags={tags} />,
        })
      }}
    />
  );
});
