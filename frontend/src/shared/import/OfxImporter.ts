import { get, map } from 'lodash'
import * as ofx from 'node-ofx-parser'
import { formatDateFmt, parseDateFmt } from '../../utils/Date'

import MoneeeyStore from '../MoneeeyStore'
import {
  ProcessContentFn,
  ImportTask,
  ProcessProgressFn,
  ImportResult,
} from './ImportContent'
import { txtImportFromLines } from './TxtImporter'

export function ofxImport(): ProcessContentFn {
  return async function (
    moneeeyStore: MoneeeyStore,
    data: ImportTask,
    onProgress: ProcessProgressFn
  ): Promise<ImportResult> {
    const preloadSteps = 8
    let loadStep = 1
    onProgress(loadStep++, preloadSteps)
    const buff = await data.input.contents.text()
    onProgress(loadStep++, preloadSteps)
    const parsedOfx = ofx.parse(buff)
    onProgress(loadStep++, preloadSteps)
    const transactions = get(
      parsedOfx,
      'OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN',
      []
    )
    const lines: string[] = map(transactions, (t) => {
      const ofxDateFormat = 'yyyyMMdd'
      const datets = parseDateFmt(
        t['DTPOSTED'].slice(0, ofxDateFormat.length),
        ofxDateFormat
      )
      const date = formatDateFmt(datets, data.config.dateFormat)
      const value = t['TRNAMT']
      const other = map(t, (value, key) => key + ' ' + value + ' ').join(' ')
      return `${date};${value};${other}`
    })
    console.log('ofxImport', { parsedOfx, transactions, lines })
    return txtImportFromLines(moneeeyStore, data, onProgress, lines)
  }
}
