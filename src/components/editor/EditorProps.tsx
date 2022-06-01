import { IAccount, TAccountUUID } from '../../shared/Account';
import { ICurrency, TCurrencyUUID } from '../../shared/Currency';

interface validation {
  valid: boolean;
  error?: string;
}

export enum EditorType {
  TEXT='TEXT',
  NUMBER='NUMBER',
  DATE='DATE',
  CURRENCY='CURRENCY',
  ACCOUNT='ACCOUNT',
}

export interface EditorProps<EntityType, ValueEditorType, ValueEntityType> {
  editor: EditorType;
  field: string;
  title: string;
  index: number;
  readOnly?: boolean;
  required?: boolean;
  entity?: EntityType,
  validate?: (value: ValueEditorType) => validation;
  onUpdate?: (entity: EntityType, value: ValueEntityType) => void;
  onSave?: (entity: EntityType) => void;
}

export interface TextEditorProps<EntityType> extends EditorProps<EntityType, string, string> {
  editor: EditorType.TEXT;
}

export interface NumberEditorProps<EntityType> extends EditorProps<EntityType, number, number> {
  editor: EditorType.NUMBER;
}

export interface DateEditorProps<EntityType> extends EditorProps<EntityType, moment.Moment, string> {
  editor: EditorType.DATE;
}

export interface AccountEditorProps<EntityType> extends EditorProps<EntityType, TAccountUUID, TAccountUUID> {
  editor: EditorType.ACCOUNT;
  accounts: IAccount[];
}

export interface CurrencyEditorProps<EntityType> extends EditorProps<EntityType, TCurrencyUUID, TCurrencyUUID> {
  editor: EditorType.CURRENCY;
  currencies: ICurrency[];
}

export type EditorPropsType<T> = TextEditorProps<T> |
  NumberEditorProps<T> |
  DateEditorProps<T> |
  AccountEditorProps<T> |
  CurrencyEditorProps<T>;
