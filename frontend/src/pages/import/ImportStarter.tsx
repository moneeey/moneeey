import { head, isEmpty, last } from 'lodash';
import { observer } from 'mobx-react';
import { ChangeEvent, Dispatch, useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { Input } from '../../components/base/Input';
import { AccountSelector } from '../../components/editor/AccountEditor';
import { TAccountUUID } from '../../entities/Account';
import ConfigStore from '../../entities/Config';
import { FileUploaderMode, ImportConfig, ImportInput, ImportTask } from '../../shared/import/ImportContent';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { TDateFormat } from '../../utils/Date';
import Messages from '../../utils/Messages';

import './ImportStarter.less';

export interface FileUploaderProps {
  onFile: (input: ImportInput) => void;
  error: string | false;
}

const FileUploader = function ({ onFile, error }: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((f) => {
        const mode = last(f.name.split('.')) || 'txt';
        onFile({
          name: f.name,
          mode: mode as FileUploaderMode,
          contents: f,
        });
      });
    },
    [onFile]
  );

  const disabled = Boolean(error);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: true,
    useFsAccessApi: false,
    accept: {
      'text/plain': ['.txt', '.csv'],
      'application/x-ofx': ['.ofx'],

      // 'application/x-pdf': ['.pdf'],
    },
  });

  const inputProps = getInputProps();

  return (
    <>
      <div
        className={`importArea${disabled ? 'Disabled' : 'Enabled'}`}
        onClick={inputProps.onClick}
        {...getRootProps()}>
        <input {...inputProps} />
        <p>
          <strong>{error}</strong>
        </p>
        <p>{isDragActive ? Messages.import.drop_here : Messages.import.click_or_drop_here}</p>
        <p>{Messages.import.supported_formats}</p>
      </div>
    </>
  );
};

interface ReferenceAccountSelectorProps {
  referenceAccount: TAccountUUID;
  onReferenceAccount: (account: TAccountUUID) => void;
}

export const ReferenceAccountSelector = observer(
  ({ referenceAccount, onReferenceAccount }: ReferenceAccountSelectorProps) => {
    const moneeeyStore = useMoneeeyStore();

    return (
      <AccountSelector
        title={Messages.import.select_reference_account}
        account={referenceAccount}
        accounts={moneeeyStore.accounts.allNonPayees}
        onSelect={(value) => onReferenceAccount(value)}
      />
    );
  }
);

const ImportStarter = function ({
  onTask,
  configuration,
}: {
  onTask: Dispatch<ImportTask>;
  configuration: ConfigStore;
}) {
  const { accounts } = useMoneeeyStore();
  const [config, setConfig] = useState(
    () =>
      ({
        dateFormat: configuration.main.date_format,
        decimalSeparator: configuration.main.decimal_separator,
        referenceAccount: head(accounts.allNonPayees)?.account_uuid || '',
      } as ImportConfig)
  );

  const error = isEmpty(config.referenceAccount) && Messages.import.select_reference_account;
  const onFile = (input: ImportInput) => {
    onTask({ input, config });
  };

  return (
    <>
      <h2>{Messages.import.new_import}</h2>
      <section className='importStarter'>
        <section className='importSettings'>
          <h3>{Messages.import.configuration}</h3>
          <div className='referenceAccount'>
            {Messages.settings.reference_account}
            <ReferenceAccountSelector
              referenceAccount={config.referenceAccount}
              onReferenceAccount={(referenceAccount) =>
                setConfig((currentConfig) => ({ ...currentConfig, referenceAccount }))
              }
            />
          </div>
          <div>
            {Messages.util.date_format}
            <Input
              data-test-id='inputDateFormat'
              type='text'
              placeholder={TDateFormat}
              value={config.dateFormat}
              onChange={({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
                setConfig((currentConfig) => ({ ...currentConfig, dateFormat: value }))
              }
            />
          </div>
          <div>
            {Messages.settings.decimal_separator}
            <Input
              data-test-id='inputDecimalSeparator'
              type='text'
              placeholder={'. or ,'}
              value={config.decimalSeparator}
              onChange={({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
                setConfig((currentConfig) => ({ ...currentConfig, decimalSeparator: value }))
              }
            />
          </div>
        </section>
        {!error && <FileUploader onFile={onFile} error={error} />}
      </section>
    </>
  );
};

export { ImportStarter, ImportStarter as default };
