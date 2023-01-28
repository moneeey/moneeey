import { compact, values } from 'lodash';
import { observer } from 'mobx-react';

import { IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';

import { FieldProps, Row } from './editor/EditorProps';

import { WithDataTestId } from './base/Common';
import { EntityEditorForField } from './editor/RenderEditor';

import './FormEditor.less';
import { TextNormal } from './base/Text';

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
    <section className={`formEditor ${className || ''}`} {...{ 'data-test-id': dataTestId }}>
      {compact(values(store.schema()))
        .sort((a: FieldProps<never>, b: FieldProps<never>) => a.index - b.index)
        .map((field: FieldProps<never>) => (
          <div className='entry' key={field.field}>
            <TextNormal>{field.title}</TextNormal>
            {EntityEditorForField({
              entityId,
              context,
              factory: store.factory,
              field,
              store,
            })}
          </div>
        ))}
    </section>
  )
);
