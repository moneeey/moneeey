import * as PDFJS from 'pdfjs-dist'
import 'pdfjs-dist/build/pdf.worker.entry.js'
import { TextItem } from 'pdfjs-dist/types/src/display/api'

import MoneeeyStore from '../MoneeeyStore'
import { ProcessContentFn, ImportTask, ProcessProgressFn, ImportResult } from './ImportContent'
import { txtImportFromLines } from './TxtImporter'

PDFJS.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.js'

export function pdfImport(): ProcessContentFn {
  return async function (moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn): Promise<ImportResult> {
    const preloadSteps = 8
    let loadStep = 1
    onProgress(loadStep++, preloadSteps)
    const buff = await data.input.contents.arrayBuffer()
    onProgress(loadStep++, preloadSteps)
    const arr = new Uint8Array(buff)
    onProgress(loadStep++, preloadSteps)
    const pdf = await PDFJS.getDocument(arr).promise
    onProgress(loadStep++, preloadSteps)
    const pdfTxtPages =  await Promise.all(Array.from({ length: pdf.numPages }, async (_, i) => {
      const page = await pdf.getPage(i + 1)
      onProgress(loadStep++, preloadSteps + pdf.numPages)
      const tokens = await page.getTextContent()
      const txt = tokens.items.map(token => (token as TextItem).str || '').join('')
      return txt
    }))
    onProgress(loadStep++, preloadSteps)
    const pdfTxt = pdfTxtPages.join('\n')
    onProgress(loadStep++, preloadSteps)
    const datePattern = data.config.dateFormat
      .replace(/\w/g, '\\w')
      .replace('/', '\\/')
    const pattern = `(?=${datePattern})`
    const lines = pdfTxt.split(new RegExp(pattern))
    console.log('pdfImport', { pdfTxt, pattern, lines })
    onProgress(loadStep++, preloadSteps)
    return txtImportFromLines(moneeeyStore, data, onProgress, lines)
  }
}
