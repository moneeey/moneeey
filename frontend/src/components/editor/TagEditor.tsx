import _, { flattenDeep } from 'lodash';
import { observer } from 'mobx-react';

import { IBaseEntity } from '../../shared/Entity';

import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Select from '../base/Select';

import BaseSelectEditor from './BaseSelectEditor';
import { EditorProps, NoSorter } from './EditorProps';

export const TagEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, string[], string[]>) => {
    const { tags } = useMoneeeyStore();
    const entity = props.store.byUuid(props.entityId);
    const currentValue = entity?.[props.field.field] as string[];

    return (
      <BaseSelectEditor
        {...{
          ...props,
          value: currentValue,
          rev: entity?._rev || '',
          options: _(tags.all)
            .map(
              (tag) =>
                ({ label: tag, value: tag } as unknown as {
                  label: string;
                  value: string[];
                })
            )
            .compact()
            .value(),
          ComposedProps: (onChange: (value?: string[], editorValue?: string[], additional?: object) => void) => ({
            onChange: (value: string[]) => onChange(flattenDeep([value])),
            onSelect: (value: string) => onChange(flattenDeep([[value], [currentValue]])),
            mode: 'tags',
          }),
          ComposedInput: Select,
        }}
      />
    );
  }
);

export const TagSorter = NoSorter;
