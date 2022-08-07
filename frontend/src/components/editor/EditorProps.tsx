import { IAccount, TAccountUUID } from '../../shared/Account';
import { ICurrency, TCurrencyUUID } from '../../shared/Currency';
import MappedStore from '../../shared/MappedStore';

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
  TAG='TAG',
}

export interface SchemaProps<EntityType, ValueEditorType, ValueEntityType> {
  editor: EditorType;
  field: string;
  title: string;
  index: number;
  readOnly?: boolean;
  required?: boolean;
  validate?: (value: ValueEditorType) => validation;
  onUpdate?: (value: ValueEntityType) => EntityType;
}

export interface EditorProps<EntityType, ValueEditorType, ValueEntityType> extends SchemaProps<EntityType, ValueEditorType, ValueEntityType> {
  entityId: string;
  store: MappedStore<any, any>;
}

export interface TextEditorProps<EntityType> extends EditorProps<EntityType, string, string> {
}

export interface NumberEditorProps<EntityType> extends EditorProps<EntityType, number, number> {
}

export interface DateEditorProps<EntityType> extends EditorProps<EntityType, moment.Moment, string> {
}

export interface AccountEditorProps<EntityType> extends EditorProps<EntityType, TAccountUUID, TAccountUUID> {
  accounts: IAccount[];
}

export interface CurrencyEditorProps<EntityType> extends EditorProps<EntityType, TCurrencyUUID, TCurrencyUUID> {
  currencies: ICurrency[];
}

export interface TagEditorProps<EntityType> extends EditorProps<EntityType, string[], string[]> {
  tags: string[];
}

export type EditorPropsType<T> = TextEditorProps<T> |
  NumberEditorProps<T> |
  DateEditorProps<T> |
  AccountEditorProps<T> |
  TagEditorProps<T> |
  CurrencyEditorProps<T>;
