import { Dispatch, SetStateAction, useEffect, useState } from 'react';

import {
  FileUploaderMode,
  ImportResult,
  ImportTask,
  ProcessContentFn,
  ProcessProgressFn,
} from '../../shared/import/ImportContent';
import pdfImport from '../../shared/import/PdfImporter';
import txtImport from '../../shared/import/TxtImporter';
import ofxImport from '../../shared/import/OfxImporter';
import MoneeeyStore from '../../shared/MoneeeyStore';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

import { ImportProcessResult } from './ImportProcessResult';

export const ContentProcessor: Record<FileUploaderMode, ProcessContentFn> = {
  txt: txtImport(),
  csv(moneeeyStore: MoneeeyStore, data: ImportTask, onProgress: ProcessProgressFn): Promise<ImportResult> {
    return ContentProcessor.txt(moneeeyStore, data, onProgress);
  },
  pdf: pdfImport(),
  ofx: ofxImport(),
};

const process = async ({
  moneeeyStore,
  task,
  processor,
  setProgress,
  setResult,
}: {
  moneeeyStore: MoneeeyStore;
  task: ImportTask;
  processor?: ProcessContentFn;
  setProgress: Dispatch<SetStateAction<number>>;
  setResult: Dispatch<SetStateAction<ImportResult>>;
}) => {
  const onProgress = (percentage: number) => setProgress(percentage);
  if (processor) {
    setResult(await processor(moneeeyStore, task, onProgress));
  }
};

const ImportProcess = function ({ task, close }: { task: ImportTask; close: () => void }) {
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult>({
    errors: [],
    transactions: [],
    recommended_accounts: {},
    update: {},
  });
  const moneeeyStore = useMoneeeyStore();

  useEffect(() => {
    const processor = ContentProcessor[task.input.mode];
    process({ moneeeyStore, task, processor, setProgress, setResult });
  }, [task]);

  return (
    <>
      <h4>
        {Messages.import.processing} <strong>{task.input.mode}</strong> {task.input.name} ({progress}%)
      </h4>
      {result && <ImportProcessResult {...{ task, result, setResult, close }} />}
    </>
  );
};

export { ImportProcess, ImportProcess as default };
