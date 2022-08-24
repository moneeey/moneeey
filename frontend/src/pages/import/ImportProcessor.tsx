import { useEffect, useState } from 'react'
import { FileUploaderMode, ImportResult, ImportTask, ProcessContentFn, ProcessProgressFn } from '../../shared/import/ImportContent'
import { txtImport } from '../../shared/import/TxtImporter'
import MoneeeyStore from '../../shared/MoneeeyStore'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'
import { ImportProcessResult } from './ImportProcessResult'

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

function ImportProcess({ task }: { task: ImportTask }) {
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult>(undefined as unknown as ImportResult)
  const moneeeyStore = useMoneeeyStore()

  useEffect(() => {
    (async () => {
      const processor = ContentProcessor[task.input.mode]
      if (processor) {
        const onProgress = (tasks: number, tasksTotal: number) => setProgress(Math.round((1 - (tasks / tasksTotal)) * 10000) / 100)
        setResult(await processor(moneeeyStore, task, onProgress))
      } else {
        setResult({
          errors: [{
            data: task.input.name,
            description: Messages.import.unknown_mode(task.input.mode),
          }],
          transactions: [],
          recommended_accounts: {},
        })
      }
    })()
  }, [task])

  return (
    <>
      <h4>{Messages.import.processing} <strong>{task.input.mode}</strong> {task.input.name} ({progress}%)</h4>
      {result && <ImportProcessResult {...{ task, result, setResult }} />}
    </>
  )
}

export { ImportProcess, ImportProcess as default }