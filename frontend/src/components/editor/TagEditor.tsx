import _ from 'lodash';
import { observer } from 'mobx-react';

import { IBaseEntity } from '../../shared/Entity';

import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { MultiSelect } from '../base/Select';

import { BaseEditor } from './BaseEditor';
import { EditorProps, NoSorter } from './EditorProps';

export const TagEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, string[], string[]>) => {
    const { tags } = useMoneeeyStore();
    const entity = props.store.byUuid(props.entityId);
    const currentValue = entity?.[props.field.field] as string[];

    const availableTags = _(tags.all)
      .map((tag) => ({ label: tag, value: tag }))
      .compact()
      .value();

    return (
      <BaseEditor
        {...{
          ...props,
          value: currentValue,
          rev: entity?._rev || '',
        }}
        Composed={(baseProps, onChange) => (
          <MultiSelect
            {...baseProps}
            value={currentValue}
            options={availableTags}
            onChange={(newValue) => newValue && onChange(newValue, newValue)}
            onCreate={(tagName) => {
              tags.register(tagName);
              const newValue = [...currentValue, tagName];
              onChange(newValue, newValue);
            }}
          />
        )}
      />
    );
  }
);

export const TagSorter = NoSorter;
