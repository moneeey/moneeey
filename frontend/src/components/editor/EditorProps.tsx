import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';

interface validation {
  valid: boolean;
  error?: string;
}

export enum EditorType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  CURRENCY = 'CURRENCY',
  ACCOUNT = 'ACCOUNT',
  ACCOUNT_TYPE = 'ACCOUNT_TYPE',
  TAG = 'TAG',
  MEMO = 'MEMO',
  TRANSACTION_VALUE = 'TRANSACTION_VALUE',
  LABEL = 'LABEL',
  BUDGET_REMAINING = 'BUDGET_REMAINING',
  BUDGET_ALLOCATED = 'BUDGET_ALLOCATED',
  LINK = 'LINK',
  BUDGET_USED = 'BUDGET_USED',
  CHECKBOX = 'CHECKBOX',
}

export interface FieldProps<ValueEditorType> {
  editor: EditorType;
  field: string;
  title?: string;
  index: number;
  readOnly?: boolean;
  required?: boolean;
  defaultSortOrder?: 'descend' | 'ascend';
  width?: number;
  validate?: (value: ValueEditorType) => validation;
}

export interface EditorProps<TEntityType extends IBaseEntity, ValueEditorType, ValueEntityType> {
  entityId?: string;
  field: FieldProps<ValueEditorType>;
  store: MappedStore<TEntityType>;
  context?: unknown;
  onUpdate: (value: ValueEntityType, additional: object) => TEntityType;
}

export const NoSorter = (): false => false;
