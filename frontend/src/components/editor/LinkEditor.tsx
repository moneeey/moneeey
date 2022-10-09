import { observer } from 'mobx-react';

import { IBaseEntity } from '../../shared/Entity';

import { EditorProps } from './EditorProps';
import { TextSorter } from './TextEditor';

export const LinkEditor = observer(<EntityType extends IBaseEntity>(props: EditorProps<EntityType, string, string>) => {
  const entity = props.store.byUuid(props.entityId);
  const value = entity?.[props.field.field] as string;

  return (
    <a
      href='#'
      onClick={(e) => {
        e.preventDefault();

        // The next lines don't make me any proud!

        // eslint-disable-next-line  @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const ctx = props.context as any;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        ctx[props.field.field](entity);
      }}>
      {value}
    </a>
  );
});

export const LinkSorter = TextSorter;
