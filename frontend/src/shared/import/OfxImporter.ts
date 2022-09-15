import _, { map } from 'lodash'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findBankTranlists = (obj: any): any => {
  if (typeof obj === 'object') {
    return _(obj)
      .entries()
      .flatMap(([k, v]) =>
        typeof v === 'object' && k !== 'BANKTRANLIST'
          ? findBankTranlists(v)
          : typeof v === 'object' && k === 'BANKTRANLIST'
          ? v.STMTTRN
          : []
      )
      .flatten()
      .value()
  } else {
    return []
  }
}

export function ofxImport(): ProcessContentFn {
  return async function (
    moneeeyStore: MoneeeyStore,
    data: ImportTask,
    onProgress: ProcessProgressFn
  ): Promise<ImportResult> {
    const preloadSteps = 9
    const SEP = '@'
    let loadStep = 1
    onProgress(loadStep++, preloadSteps)
    const buff = await data.input.contents.text()
    onProgress(loadStep++, preloadSteps)
    const parsedOfx = ofx.parse(buff)
    onProgress(loadStep++, preloadSteps)
    const transactions = findBankTranlists(parsedOfx)
    console.log('ofxImport transactions', { parsedOfx, transactions })
    onProgress(loadStep++, preloadSteps)
    const lines: string[] = map(transactions, (t) => {
      const ofxDateFormat = 'yyyyMMdd'
      const datets = parseDateFmt(
        t['DTPOSTED'].slice(0, ofxDateFormat.length),
        ofxDateFormat
      )
      const date = formatDateFmt(datets, data.config.dateFormat)
      const value = t['TRNAMT']
      const other = t['MEMO']
      return `${date}${SEP}${value}${SEP}${other}`
    })
    console.log('ofxImport lines', { lines })
    return txtImportFromLines(moneeeyStore, data, onProgress, lines, SEP)
  }
}
