import { head, isEmpty, shuffle } from 'lodash'
import { TAccountUUID } from '../entities/Account'
import { ITransaction, TTransactionUUID } from '../entities/Transaction'
import { currentDateTime, formatDate, isValidDate, parseDateFmt, TDateFormat } from '../utils/Date'
import { asyncTimeout, asyncProcess, uuid } from '../utils/Utils'
import { EntityType } from './Entity'
import MoneeeyStore from './MoneeeyStore'

export type FileUploaderMode = 'txt' | 'csv'
// TODO: xls, xlsx, ofx, pdf

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
  is_updating: Set<TTransactionUUID>;
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

export const ContentProcessor: Record<FileUploaderMode, ProcessContentFn> = {
  txt: function (moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn): Promise<ImportResult> {
    return asyncTimeout(async () => {
      const { importer } = moneeeyStore
      const preloadSteps = 5
      let loadStep = 1
      onProgress(loadStep++, preloadSteps)
      const text = (await data.input.contents.text()).replace('\r', '')
      onProgress(loadStep++, preloadSteps)
      const lines = text.split('\n')
      onProgress(loadStep++, preloadSteps)
      const first10 = lines.slice(0, 10)
      const sep = findSeparator(first10.join('\n'))
      const columns = findColumns((head(shuffle(first10)) || '').split(sep), data.config.dateFormat || TDateFormat)
      if (columns.dateIndex === -1) {
        return Promise.resolve({ errors: [{ data: first10.join('\n'), description: 'Date column not found' }], transactions: [], recommended_accounts: {}, is_updating: new Set() })
      }
      if (columns.valueIndex === -1) {
        return Promise.resolve({ errors: [{ data: first10.join('\n'), description: 'Value/Amount column not found' }], transactions: [], recommended_accounts: {}, is_updating: new Set() })
      }
      onProgress(loadStep++, preloadSteps)
      const tokenMap = importer.tokenMap
      onProgress(loadStep++, preloadSteps)

      return await asyncProcess(lines, (chunk, stt, _chunks, tasks, tasksTotal) => {
        onProgress(tasks, tasksTotal)
        chunk.forEach(line => {
          const { referenceAccount, dateFormat } = data.config
          const tokens = line.replace('"', '').split(sep)
          if (tokens.length < 2) return
          const { value, date, other } = retrieveColumns(tokens, columns, dateFormat || TDateFormat)
          const accounts = importer.findAccountsForTokens(referenceAccount, tokenMap, other)
          const other_account = accounts[0]|| ''
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
            stt.is_updating.add(existing.transaction_uuid)
            transaction.transaction_uuid = existing.transaction_uuid
            if (existing.memo !== transaction.memo) {
              transaction.memo = existing.memo + ';' + transaction.memo
            }
            transaction.tags = existing.tags
            transaction.from_account = transaction.from_account || existing.from_account
            transaction.to_account = transaction.to_account || existing.to_account
            transaction._rev = existing._rev
          }
          stt.transactions.push(transaction)
          stt.recommended_accounts[transaction.transaction_uuid] = accounts
        })
      }, {
        errors: [],
        transactions: [],
        recommended_accounts: {},
        is_updating: new Set(),
      } as ImportResult, 20, 50)
    }, 100)
  },
  csv: function (moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn): Promise<ImportResult> {
    return ContentProcessor['txt'](moneeeyStore, data, onProgress)
  },
}