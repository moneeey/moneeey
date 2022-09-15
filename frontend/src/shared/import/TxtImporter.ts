import { head, isEmpty, shuffle } from 'lodash'
import { ITransaction } from '../../entities/Transaction'
import { TDateFormat } from '../../utils/Date'
import { asyncProcess } from '../../utils/Utils'
import MoneeeyStore from '../MoneeeyStore'
import {
  ProcessContentFn,
  ImportTask,
  ProcessProgressFn,
  ImportResult,
  findSeparator,
  findColumns,
  retrieveColumns,
  importTransaction,
} from './ImportContent'

export async function txtImportFromLines(
  moneeeyStore: MoneeeyStore,
  data: ImportTask,
  onProgress: ProcessProgressFn,
  lines: string[],
  separator = ''
): Promise<ImportResult> {
  if (isEmpty(lines)) {
    return Promise.resolve({
      errors: [
        {
          data: '',
          description: 'Empty',
        },
      ],
      transactions: [],
      recommended_accounts: {},
    })
  }
  const { importer } = moneeeyStore
  onProgress(1, 3)
  const first10 = lines.slice(0, 10)
  const sep = !isEmpty(separator)
    ? separator
    : findSeparator(first10.join('\n'))
  const columns = findColumns(
    (head(shuffle(first10)) || '').split(sep),
    data.config.dateFormat || TDateFormat
  )
  console.log('txtImportFromLines', { sep, columns, first10 })
  if (columns.dateIndex === -1 || columns.valueIndex === -1) {
    return Promise.resolve({
      errors: [
        {
          data: first10.join('\n'),
          description:
            (columns.dateIndex === -1 ? 'Date' : 'Value') + ' column not found',
        },
      ],
      transactions: [],
      recommended_accounts: {},
    })
  }
  onProgress(2, 3)
  const tokenMap = importer.tokenMap
  onProgress(3, 3)

  return await asyncProcess<string, ImportResult>(
    lines,
    (chunk, stt, _chunks, tasks, tasksTotal) => {
      onProgress(tasks, tasksTotal)
      chunk.forEach((line) => {
        const { referenceAccount, dateFormat } = data.config
        const tokens = line.replace('"', '').split(sep)
        if (tokens.length < 2) {
          stt.errors.push({
            data: line,
            description: 'Not enough tokens: ' + tokens.join(','),
          })
          return
        }
        const { value, date, other } = retrieveColumns(
          tokens,
          columns,
          dateFormat || TDateFormat
        )
        const accounts = importer.findAccountsForTokens(
          referenceAccount,
          tokenMap,
          other
        )
        const other_account = accounts[0] || ''
        const transaction: ITransaction = importTransaction(
          date,
          line,
          value,
          referenceAccount,
          other_account,
          importer
        )
        stt.transactions.push(transaction)
        stt.recommended_accounts[transaction.transaction_uuid] = accounts
      })
    },
    {
      errors: [],
      transactions: [],
      recommended_accounts: {},
    },
    20,
    50
  )
}

export function txtImport(): ProcessContentFn {
  return async function (
    moneeeyStore: MoneeeyStore,
    data: ImportTask,
    onProgress: ProcessProgressFn
  ): Promise<ImportResult> {
    onProgress(1, 3)
    const text = (await data.input.contents.text()).replace('\r', '')
    onProgress(2, 3)
    const lines = text.split('\n')
    onProgress(3, 3)
    return txtImportFromLines(moneeeyStore, data, onProgress, lines)
  }
}
