import MappedStore from '../../shared/MappedStore'

interface validation {
  valid: boolean
  error?: string
}


export enum EditorType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  CURRENCY = 'CURRENCY',
  ACCOUNT = 'ACCOUNT',
  TAG = 'TAG',
  MEMO = 'MEMO',
  TRANSACTION_VALUE = 'TRANSACTION_VALUE',
  LABEL = 'LABEL',
  BUDGET_REMAINING = 'BUDGET_REMAINING',
  BUDGET_ALLOCATED = 'BUDGET_ALLOCATED',
  LINK = 'LINK',
  BUDGET_USED = 'BUDGET_USED',
}

export interface FieldProps<ValueEditorType> {
  editor: EditorType
  field: string
  title?: string
  index: number
  readOnly?: boolean
  required?: boolean
  defaultSortOrder?: 'descend' | 'ascend'
  width?: number
  validate?: (value: ValueEditorType) => validation
}

export interface EditorProps<TEntityType, ValueEditorType, ValueEntityType> {
  entityId?: string
  field: FieldProps<ValueEditorType>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: MappedStore<any>
  context?: unknown
  onUpdate: (value: ValueEntityType, additional: object) => TEntityType
}

export const NoSorter = (): false => false
