import { head, isEmpty, shuffle } from 'lodash'
import { ITransaction } from '../entities/Transaction'
import { formatDate, isValidDate, parseDateFmt, TDateFormat } from '../utils/Date'
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
    value: parseFloat(tokens[columns.valueIndex].replace(/,/, '.')),
    date: formatDate(parseDateFmt(tokens[columns.dateIndex], dateFormat)),
    other: tokens.filter((_v, index) => index !== columns.valueIndex && index !== columns.dateIndex)
  }
}

export const ContentProcessor: Record<FileUploaderMode, ProcessContentFn> = {
  txt: function (moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn): Promise<ImportResult> {
    return asyncTimeout(async () => {
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
        return Promise.resolve({ errors: [{ data: first10.join('\n'), description: 'Date column not found' }], transactions: [] })
      }
      if (columns.valueIndex === -1) {
        return Promise.resolve({ errors: [{ data: first10.join('\n'), description: 'Value/Amount column not found' }], transactions: [] })
      }
      onProgress(loadStep++, preloadSteps)
      const tokenMap = moneeeyStore.transactions.tokenMap
      onProgress(loadStep++, preloadSteps)

      return await asyncProcess(lines, (chunk, stt, _chunks, tasks, tasksTotal) => {
        onProgress(tasks, tasksTotal)
        chunk.forEach(line => {
          const tokens = line.split(sep)
          const { value, date, other } = retrieveColumns(tokens, columns, data.config.dateFormat || TDateFormat)
          const from_account = data.config.referenceAccount || ''
          const accounts = moneeeyStore.transactions.findAccountsForTokens(from_account, tokenMap, other)
          const to_account = accounts[0]|| ''
          const import_id = `date=${date} accounts=${[from_account, to_account].sort().join(',')} value=${value}`
          const transaction: ITransaction = {
            entity_type: EntityType.TRANSACTION,
            transaction_uuid: uuid(),
            date,
            from_account,
            to_account,
            from_value: value,
            to_value: value,
            memo: line,
            tags: [],
            import_id,
            import_data: line,
          }
          stt.transactions.push(transaction)
          return stt
        })
      }, {
        errors: [],
        transactions: [],
      } as ImportResult, 10, 50)
    }, 100)
  },
  csv: function (moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn): Promise<ImportResult> {
    return ContentProcessor['txt'](moneeeyStore, data, onProgress)
  },
}