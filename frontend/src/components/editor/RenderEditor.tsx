import { debounce } from 'lodash';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';

import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import MoneeeyStore from '../../shared/MoneeeyStore';
import { ColumnDef, Row } from '../VirtualTableEditor';

import { AccountEditor, AccountSorter } from './AccountEditor';
import { AccountTypeEditor, AccountTypeSorter } from './AccountTypeEditor';
import { BudgetValueEditor, BudgetValueSorter } from './BudgetValueEditor';
import { CheckboxEditor, CheckboxSorter } from './CheckboxEditor';
import { CurrencyEditor, CurrencySorter } from './CurrencyEditor';
import { DateEditor, DateSorter } from './DateEditor';
import { EditorProps, EditorType, FieldProps } from './EditorProps';
import { LabelEditor, LabelSorter } from './LabelEditor';
import { LinkEditor, LinkSorter } from './LinkEditor';
import { MemoEditor, MemoSorter } from './MemoEditor';
import { NumberEditor, NumberSorter } from './NumberEditor';
import { TagEditor, TagSorter } from './TagEditor';
import { TextEditor, TextSorter } from './TextEditor';
import { TransactionValueEditor, TransactionValueSorter } from './TransactionValueEditor';

type SortRow = (a: Row, b: Row, asc: boolean) => number;
type SortFn = <TEditorType extends IBaseEntity>(
  store: MappedStore<TEditorType>,
  field: keyof TEditorType,
  moneeeyStore: MoneeeyStore
) => false | SortRow;

export const EditorTypeConfig: Record<
  EditorType,
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (pros: EditorProps<any, any, any>) => JSX.Element;
    sorter: SortFn;
    width: number | undefined;
  }
> = {
  [EditorType.TEXT]: {
    render: TextEditor,
    sorter: TextSorter,
    width: undefined,
  },
  [EditorType.NUMBER]: {
    render: NumberEditor,
    sorter: NumberSorter,
    width: undefined,
  },
  [EditorType.CHECKBOX]: {
    render: CheckboxEditor,
    sorter: CheckboxSorter,
    width: 120,
  },
  [EditorType.DATE]: {
    render: DateEditor,
    sorter: DateSorter,
    width: 120,
  },
  [EditorType.ACCOUNT]: {
    render: AccountEditor,
    sorter: AccountSorter,
    width: undefined,
  },
  [EditorType.ACCOUNT_TYPE]: {
    render: AccountTypeEditor,
    sorter: AccountTypeSorter,
    width: undefined,
  },
  [EditorType.CURRENCY]: {
    render: CurrencyEditor,
    sorter: CurrencySorter,
    width: undefined,
  },
  [EditorType.TAG]: {
    render: TagEditor,
    sorter: TagSorter,
    width: undefined,
  },
  [EditorType.MEMO]: {
    render: MemoEditor,
    sorter: MemoSorter,
    width: undefined,
  },
  [EditorType.TRANSACTION_VALUE]: {
    render: TransactionValueEditor,
    sorter: TransactionValueSorter,
    width: 200,
  },
  [EditorType.BUDGET_VALUE]: {
    render: BudgetValueEditor,
    sorter: BudgetValueSorter,
    width: undefined,
  },
  [EditorType.LABEL]: {
    render: LabelEditor,
    sorter: LabelSorter,
    width: undefined,
  },
  [EditorType.LINK]: {
    render: LinkEditor,
    sorter: LinkSorter,
    width: undefined,
  },
};

export const EntityEditorForField = <T extends IBaseEntity, Context, TField>({
  entityId,
  context,
  store,
  field,
  factory,
}: {
  context: Context;
  store: MappedStore<T>;
  field: FieldProps<TField>;
  factory: (id?: string) => T;
} & Row) => {
  const key = `${entityId}_${field.field}`;
  const onUpdate = action((value: unknown, additional: object = {}) => {
    store.merge({
      ...(store.byUuid(entityId) || factory(entityId)),
      [field.field]: value,
      ...additional,
    } as T);
  });

  const MonitorLoading = observer(() => {
    const isLoading = field.isLoading && field.isLoading({ entityId }) === true;
    if (isLoading) {
      return <span>Loading</span>;
    }

    const config = EditorTypeConfig[field.editor];
    const Editor = config.render;

    return (
      <Editor
        {...{
          store,
          entityId,
          key,
          field,
          onUpdate,
          context,
        }}
      />
    );
  });

  return <MonitorLoading key={key} />;
};

export const TableColumnDefForField = <T extends IBaseEntity, Context>({
  moneeeyStore,
  context,
  store,
  field,
  factory,
}: {
  moneeeyStore: MoneeeyStore;
  context: Context;
  store: MappedStore<T>;
  field: FieldProps<never>;
  factory: (id?: string) => T;
}): ColumnDef => {
  const config = EditorTypeConfig[field.editor];
  const sorter = config.sorter(store, field.field as keyof T, moneeeyStore) || (() => 0);
  const { width } = config;

  return {
    width: width || field.width,
    title: field.title,
    defaultSortOrder: field.defaultSortOrder,
    index: field.index,
    sorter,
    render: ({ entityId }: Row) => (
      <EntityEditorForField
        {...{
          entityId,
          context,
          store,
          field,
          factory,
        }}
      />
    ),
  };
};
