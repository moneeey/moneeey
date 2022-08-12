import { Input } from 'antd'
import { isEmpty, last } from 'lodash'
import { ChangeEvent, Dispatch, useCallback, useState } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { AccountEditor } from '../../components/editor/AccountEditor'
import { EditorType } from '../../components/editor/EditorProps'
import { IAccount } from '../../entities/Account'
import { FileUploaderMode, ImportConfig, ImportInput, ImportTask } from '../../shared/ImportContent'
import MappedStore from '../../shared/MappedStore'
import { TDateFormat } from '../../utils/Date'
import Messages from '../../utils/Messages'


export interface FileUploaderProps {
  onFile: (input: ImportInput) => void;
  error: string | false;
}

function FileUploader({ onFile, error }: FileUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    console.log('FileUploader onDrop', { acceptedFiles, rejectedFiles })
    acceptedFiles.forEach(async f => {
      const mode = last(f.name.split('.')) || 'txt'
      onFile({
        name: f.name,
        mode: mode as FileUploaderMode,
        contents: f,
      })
    })
  }, [onFile])

  const disabled = !!error

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: true,
    accept: {
      'text/plain': ['.txt', '.csv'],
      // TODO: pdf, ofx
    },
  })

  return (
    <>
      <div className={`uploadArea${disabled ? 'Disabled' : 'Enabled'}`} {...getRootProps()}>
        <input {...getInputProps()} />
        <p><strong>{error}</strong></p>
        <p>{isDragActive ? Messages.import.drop_here : Messages.import.click_or_drop_here}</p>
        <p>{Messages.import.supported_formats}</p>
      </div>
    </>
  )
}

function ImportStarter({ onTask }: { onTask: Dispatch<ImportTask> }) {
  const [config, setConfig] = useState({
    dateFormat: TDateFormat,
    decimalSeparator: ',',
    referenceAccount: '',
  } as ImportConfig)

  const error = isEmpty(config.referenceAccount) && Messages.import.select_reference_account
  const onFile = (input: ImportInput) => {
    onTask({ input, config })
  }

  return (
    <>
      <h2>{Messages.import.new_import}</h2>
      <section className="importStarter">
        <section className="importSettings">
          <h3>{Messages.import.configuration}</h3>
          <Input.Group className="referenceAccount">
            {Messages.util.reference_account}
            <AccountEditor
              entityId={config.referenceAccount}
              field={{
                editor: EditorType.ACCOUNT,
                field: 'from_account',
                index: 0,
                title: Messages.util.reference_account,
              }}
              onUpdate={(value) => setConfig(config => ({...config, referenceAccount: value}))}
              store={{ byUuid: () => ({ from_account: config.referenceAccount } as unknown as IAccount) } as unknown as MappedStore<IAccount>} />
          </Input.Group>
          <Input.Group>
            {Messages.util.date_format}
            <Input type='text' placeholder={TDateFormat} value={config.dateFormat}
              onChange={({ target: { value } }: ChangeEvent<HTMLInputElement>) => setConfig(config => ({...config, dateFormat: value}))} />
          </Input.Group>
          <Input.Group>
            {Messages.util.decimal_separator}
            <Input type='text' placeholder={'. or ,'} value={config.decimalSeparator}
              onChange={({ target: { value } }: ChangeEvent<HTMLInputElement>) => setConfig(config => ({...config, decimalSeparator: value}))} />
          </Input.Group>
        </section>
        <FileUploader onFile={onFile} error={error} />
      </section>
    </>
  )
}

export { ImportStarter, ImportStarter as default }