import MappedStore from '../../shared/MappedStore'

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
  MEMO='MEMO',
  TRANSACTION_VALUE='TRANSACTION_VALUE',
}

export interface FieldProps<ValueEditorType> {
  editor: EditorType;
  field: string;
  title: string;
  index: number;
  readOnly?: boolean;
  required?: boolean;
  validate?: (value: ValueEditorType) => validation;
}

export interface EditorProps<FieldEntityType, ValueEditorType, ValueEntityType>  {
  entityId: string;
  field: FieldProps<ValueEditorType>;
  store: MappedStore<never, unknown>;
  onUpdate: (value: ValueEntityType, additional: object) => FieldEntityType;
}
