import { compact, values } from 'lodash';
import { observer } from 'mobx-react';

import { IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';

import { FieldProps, Row } from './editor/EditorProps';

import { WithDataTestId } from './base/Common';
import { EntityEditorForField } from './editor/RenderEditor';

import './FormEditor.less';
import { TextNormal } from './base/Text';

interface BaseFormEditor extends WithDataTestId {
  className?: string;
  items: {
    label: string;
    editor: JSX.Element;
  }[];
}

export const BaseFormEditor = ({ className, 'data-test-id': dataTestId, items }: BaseFormEditor) => (
  <section className={`formEditor ${className || ''}`} {...{ 'data-test-id': dataTestId }}>
    {items.map((item) => (
      <div className='entry' key={item.label}>
        <TextNormal>{item.label}</TextNormal>
        {item.editor}
      </div>
    ))}
  </section>
);

interface FormEditorProps<T extends IBaseEntity, Context> extends WithDataTestId {
  className?: string;
  store: MappedStore<T>;
  context?: Context;
  entity: Row;
}

export default observer(
  <T extends IBaseEntity>({
    className,
    store,
    entity: { entityId },
    context,
    'data-test-id': dataTestId,
  }: FormEditorProps<T, unknown>) => (
    <BaseFormEditor
      className={className}
      {...{ 'data-test-id': dataTestId }}
      items={compact(values(store.schema()))
        .sort((a: FieldProps<never>, b: FieldProps<never>) => a.index - b.index)
        .map((field: FieldProps<never>) => ({
          label: field.title,
          editor: EntityEditorForField({
            entityId,
            context,
            factory: store.factory,
            field,
            store,
          }),
        }))}
    />
  )
);
