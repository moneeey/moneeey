import { isEmpty } from 'lodash'
import { TAccountUUID } from '../../entities/Account'
import { ITransaction, TTransactionUUID } from '../../entities/Transaction'
import { currentDateTime, formatDate, isValidDate, parseDateFmt } from '../../utils/Date'
import { uuid } from '../../utils/Utils'
import { EntityType } from '../Entity'
import Importer from './Importer'
import MoneeeyStore from '../MoneeeyStore'

export type FileUploaderMode = 'txt' | 'csv' | 'ofx' | 'pdf'
// TODO: xls, xlsx

export interface ImportInput {
  name: string;
  contents: File;
  mode: FileUploaderMode;
}

export interface ImportConfig {
  referenceAccount: string;
  dateFormat: string;
  decimalSeparator: string;
}

export interface ImportTask {
  input: ImportInput;
  config: ImportConfig;
}

export interface ImportResult {
  errors: {
    data: string;
    description: string;
  }[];
  transactions: ITransaction[];
  recommended_accounts: Record<TTransactionUUID, TAccountUUID[]>;
}

export type ProcessProgressFn = (tasks: number, total: number) => void
export type ProcessContentFn = (moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn) => Promise<ImportResult>;

export const findSeparator = (text: string): string => {
  const candidates = new Map<string, number>()
  for(const mm of text.matchAll(/([^\w\d-+\\/" ])/gm)) {
    const sep = mm[0]
    candidates.set(sep, (candidates.get(sep) || 0) + 1)
  }
  return Array.from(candidates.entries())
    .reduce((accum, [sep, count]) => {
      if (count > accum.count) {
        return { sep, count }
      }
      return accum
    }, { sep: '', count: 0 }).sep
}

export const findColumns = (tokens: string[], dateFormat: string) => {
  const dateIndex = tokens.findIndex(tok => isValidDate(parseDateFmt(tok, dateFormat)))
  const valueIndex = tokens.findIndex((tok, idx) => idx !== dateIndex && !isEmpty(tok.match(/^[\d.",+\\-]+$/gm)))
  return { dateIndex, valueIndex }
}

export const retrieveColumns = (tokens: string[], columns: ReturnType<typeof findColumns>, dateFormat: string) => {
  return {
    value: parseFloat((tokens[columns.valueIndex]||'').replace(/,/, '.')),
    date: formatDate(parseDateFmt((tokens[columns.dateIndex]||''), dateFormat)),
    other: tokens.filter((_v, index) => index !== columns.valueIndex && index !== columns.dateIndex)
  }
}

export function importTransaction(date: string, line: string, value: number, referenceAccount: TAccountUUID, other_account: TAccountUUID, importer: Importer) {
  const transaction: ITransaction = {
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: uuid(),
    date,
    memo: line,
    tags: [],
    from_account: value < 0 ? referenceAccount : other_account,
    to_account: value < 0 ? other_account : referenceAccount,
    from_value: value,
    to_value: value,
    import_data: line,
    updated: currentDateTime(),
  }
  const import_id = importer.importId(transaction)
  const existing = importer.findForImportId(import_id)
  if (existing) {
    transaction.transaction_uuid = existing.transaction_uuid
    if (existing.memo !== transaction.memo) {
      transaction.memo = existing.memo + ';' + transaction.memo
    }
    transaction.tags = existing.tags
    transaction.from_account = transaction.from_account || existing.from_account
    transaction.to_account = transaction.to_account || existing.to_account
    transaction._rev = existing._rev
  }
  return transaction
}

export const ContentProcessor: Record<FileUploaderMode, ProcessContentFn> = {
  txt: txtImport(),
  csv: function (moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn): Promise<ImportResult> {
    return ContentProcessor['txt'](moneeeyStore, data, onProgress)
  },
  pdf: function (moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn): Promise<ImportResult> {
    return ContentProcessor['txt'](moneeeyStore, data, onProgress)
  },
  ofx: function (moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn): Promise<ImportResult> {
    return ContentProcessor['txt'](moneeeyStore, data, onProgress)
  },
}