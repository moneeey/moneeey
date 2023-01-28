import { action } from 'mobx';

import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import MoneeeyStore from '../../shared/MoneeeyStore';

import { AccountEditor, AccountSorter } from './AccountEditor';
import { AccountTypeEditor, AccountTypeSorter } from './AccountTypeEditor';
import { BudgetValueEditor, BudgetValueSorter } from './BudgetValueEditor';
import { CheckboxEditor, CheckboxSorter } from './CheckboxEditor';
import { CurrencyEditor, CurrencySorter } from './CurrencyEditor';
import { DateEditor, DateSorter } from './DateEditor';
import { EditorProps, EditorType, FieldProps, Row } from './EditorProps';
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
    width: 100,
  },
  [EditorType.DATE]: {
    render: DateEditor,
    sorter: DateSorter,
    width: 142,
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
    width: 320,
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
  const onUpdate = action((value: unknown, additional: object = {}) =>
    store.merge({
      ...(store.byUuid(entityId) || factory(entityId)),
      [field.field]: value,
      ...additional,
    } as T)
  );

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
}) => {
  const config = EditorTypeConfig[field.editor];
  const sorter = config.sorter(store, field.field as keyof T, moneeeyStore);
  const { width } = config;

  return {
    width: width || field.width,
    title: field.title,
    fieldName: field.field,
    defaultSortOrder: field.defaultSortOrder,
    sorter,
    render: (_value: unknown, { entityId }: Row) =>
      EntityEditorForField({
        entityId,
        context,
        store,
        field,
        factory,
      }),
  };
};
