import { head, isEmpty, last } from 'lodash';
import { observer } from 'mobx-react';
import { Dispatch, useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { Input } from '../../components/base/Input';
import Select from '../../components/base/Select';
import { VerticalSpace } from '../../components/base/Space';
import { TextSubtitle, TextTitle } from '../../components/base/Text';
import { TAccountUUID } from '../../entities/Account';
import ConfigStore from '../../entities/Config';
import { FileUploaderMode, ImportConfig, ImportInput, ImportTask } from '../../shared/import/ImportContent';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { TDateFormat } from '../../utils/Date';
import useMessages from '../../utils/Messages';

export interface FileUploaderProps {
  onFile: (input: ImportInput) => void;
  error: string | false;
}

const FileUploader = function ({ onFile, error }: FileUploaderProps) {
  const Messages = useMessages();
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
      'application/x-pdf': ['.pdf'],
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
    const Messages = useMessages();
    const moneeeyStore = useMoneeeyStore();

    return (
      <Select
        testId='target_account'
        placeholder={Messages.merge_accounts.target}
        value={referenceAccount}
        onChange={(newReferenceAccount) => onReferenceAccount(newReferenceAccount)}
        options={moneeeyStore.accounts.allNonPayees.map((account) => ({
          label: account.name,
          value: account.account_uuid,
        }))}
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
  const Messages = useMessages();
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
    <VerticalSpace className='mt-2 bg-background-800 p-2'>
      <TextTitle>{Messages.import.new_import}</TextTitle>
      <TextSubtitle>{Messages.import.configuration}</TextSubtitle>
      <div>
        {Messages.settings.reference_account}
        <div className='bg-background-900 p-2'>
          <ReferenceAccountSelector
            referenceAccount={config.referenceAccount}
            onReferenceAccount={(referenceAccount) =>
              setConfig((currentConfig) => ({ ...currentConfig, referenceAccount }))
            }
          />
        </div>
      </div>
      <div>
        {Messages.util.date_format}
        <div className='bg-background-900 p-2'>
          <Input
            testId='inputDateFormat'
            placeholder={TDateFormat}
            value={config.dateFormat}
            onChange={(dateFormat) => setConfig((currentConfig) => ({ ...currentConfig, dateFormat }))}
          />
        </div>
      </div>
      <div>
        {Messages.settings.decimal_separator}
        <div className='bg-background-900 p-2'>
          <Input
            testId='inputDecimalSeparator'
            placeholder={'. or ,'}
            value={config.decimalSeparator}
            onChange={(decimalSeparator) => setConfig((currentConfig) => ({ ...currentConfig, decimalSeparator }))}
          />
        </div>
      </div>
      <div className='rounded bg-secondary-200 p-4 text-secondary-900'>
        {!error && <FileUploader onFile={onFile} error={error} />}
      </div>
    </VerticalSpace>
  );
};

export { ImportStarter, ImportStarter as default };
