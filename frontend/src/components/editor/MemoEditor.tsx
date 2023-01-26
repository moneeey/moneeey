import { observer } from 'mobx-react';
import { useState } from 'react';

import { IBaseEntity } from '../../shared/Entity';
import { Input } from '../base/Input';

import { TagsMemo } from '../Tags';

import { BaseEditor } from './BaseEditor';
import { EditorProps } from './EditorProps';
import { TextSorter } from './TextEditor';

export const MemoEditor = observer(<EntityType extends IBaseEntity>(props: EditorProps<EntityType, string, string>) => {
  const tagsForText = (text: string): string[] =>
    Array.from(text.matchAll(/[^#](#\w+)/g)).map((m: RegExpMatchArray) => m[1].replace('#', ''));

  const entity = props.store.byUuid(props.entityId);
  const value = entity?.[props.field.field] as string;

  const [currentValue, setCurrentValue] = useState('');
  const memo = currentValue || value || '';
  const tags = tagsForText(memo);

  return (
    <BaseEditor
      {...{
        ...props,
        value,
        rev: entity?._rev || '',
      }}
      Composed={(baseProps, onChange) => (
        <Input
          {...baseProps}
          onChange={(newValue) => {
            setCurrentValue(newValue);

            return onChange(newValue, newValue, {
              tags: tagsForText(newValue),
            } as unknown as Partial<EntityType>);
          }}
          suffix={<TagsMemo tags={tags} />}
        />
      )}
    />
  );
});

export const MemoSorter = TextSorter;
