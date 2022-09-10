import { Input } from 'antd'
import { isEmpty, last } from 'lodash'
import { observer } from 'mobx-react'
import { ChangeEvent, Dispatch, useCallback, useState } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { AccountSelector } from '../../components/editor/AccountEditor'
import { TAccountUUID } from '../../entities/Account'
import ConfigStore from '../../entities/Config'
import {
  FileUploaderMode,
  ImportConfig,
  ImportInput,
  ImportTask,
} from '../../shared/import/ImportContent'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { TDateFormat } from '../../utils/Date'
import Messages from '../../utils/Messages'

export interface FileUploaderProps {
  onFile: (input: ImportInput) => void
  error: string | false
}

function FileUploader({ onFile, error }: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      console.log('FileUploader onDrop', { acceptedFiles, rejectedFiles })
      acceptedFiles.forEach(async (f) => {
        const mode = last(f.name.split('.')) || 'txt'
        onFile({
          name: f.name,
          mode: mode as FileUploaderMode,
          contents: f,
        })
      })
    },
    [onFile]
  )

  const disabled = !!error

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: true,
    accept: {
      'text/plain': ['.txt', '.csv'],
      'application/x-ofx': ['.ofx'],
      // 'application/x-pdf': ['.pdf'],
    },
  })

  return (
    <>
      <div
        className={`uploadArea${disabled ? 'Disabled' : 'Enabled'}`}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <p>
          <strong>{error}</strong>
        </p>
        <p>
          {isDragActive
            ? Messages.import.drop_here
            : Messages.import.click_or_drop_here}
        </p>
        <p>{Messages.import.supported_formats}</p>
      </div>
    </>
  )
}

interface ReferenceAccountSelectorProps {
  referenceAccount: TAccountUUID
  onReferenceAccount: (account: TAccountUUID) => void
}

export const ReferenceAccountSelector = observer(
  ({ referenceAccount, onReferenceAccount }: ReferenceAccountSelectorProps) => {
    const moneeeyStore = useMoneeeyStore()
    return (
      <AccountSelector
        account={referenceAccount}
        accounts={moneeeyStore.accounts.allNonPayees}
        onSelect={(value) => onReferenceAccount(value)}
      />
    )
  }
)

function ImportStarter({
  onTask,
  configuration,
}: {
  onTask: Dispatch<ImportTask>
  configuration: ConfigStore
}) {
  const [config, setConfig] = useState({
    dateFormat: configuration.main.date_format,
    decimalSeparator: configuration.main.decimal_separator,
    referenceAccount: '',
  } as ImportConfig)

  const error =
    isEmpty(config.referenceAccount) && Messages.import.select_reference_account
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
            {Messages.settings.reference_account}
            <ReferenceAccountSelector
              referenceAccount={config.referenceAccount}
              onReferenceAccount={(referenceAccount) =>
                setConfig((config) => ({ ...config, referenceAccount }))
              }
            />
          </Input.Group>
          <Input.Group>
            {Messages.util.date_format}
            <Input
              type="text"
              placeholder={TDateFormat}
              value={config.dateFormat}
              onChange={({
                target: { value },
              }: ChangeEvent<HTMLInputElement>) =>
                setConfig((config) => ({ ...config, dateFormat: value }))
              }
            />
          </Input.Group>
          <Input.Group>
            {Messages.settings.decimal_separator}
            <Input
              type="text"
              placeholder={'. or ,'}
              value={config.decimalSeparator}
              onChange={({
                target: { value },
              }: ChangeEvent<HTMLInputElement>) =>
                setConfig((config) => ({ ...config, decimalSeparator: value }))
              }
            />
          </Input.Group>
        </section>
        <FileUploader onFile={onFile} error={error} />
      </section>
    </>
  )
}

export { ImportStarter, ImportStarter as default }
