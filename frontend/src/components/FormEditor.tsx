import { compact, values } from 'lodash';
import { observer } from 'mobx-react';

import { IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';

import { FieldProps } from './editor/EditorProps';

import { WithDataTestId } from './base/Common';
import { EntityEditorForField } from './editor/RenderEditor';

import { TextNormal } from './base/Text';
import { Row } from './VirtualTableEditor';
import { VerticalSpace } from './base/Space';
import { ReactNode } from 'react';

interface BaseFormEditor extends WithDataTestId {
  className?: string;
  footer?: ReactNode;
  items: {
    label: string;
    editor: JSX.Element;
  }[];
}

export const BaseFormEditor = ({ className, 'data-test-id': dataTestId, items, footer }: BaseFormEditor) => (
  <VerticalSpace className={`bg-background-800 p-4 ${className || ''}`} {...{ 'data-test-id': dataTestId }}>
    {items.map((item) => (
      <div key={item.label}>
        <TextNormal>{item.label}</TextNormal>
        <div className='bg-background-900 p-2'>{item.editor}</div>
      </div>
    ))}
    <footer>{footer}</footer>
  </VerticalSpace>
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
