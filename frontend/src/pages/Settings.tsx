import { useState } from 'react';

import { PrimaryButton, SecondaryButton } from '../components/base/Button';
import Drawer from '../components/base/Drawer';
import { TextArea } from '../components/base/Input';
import Space from '../components/base/Space';
import useMoneeeyStore from '../shared/useMoneeeyStore';
import ConfigTable from '../tables/ConfigTable';
import Messages from '../utils/Messages';
import { noop } from '../utils/Utils';

import './Settings.less';

type Action = {
  title: string;
  content: string;
  submitTitle?: string;
  submitFn?: (data: Action) => void;
};

export default function Settings() {
  const [action, setAction] = useState<Action | undefined>(undefined);
  const moneeeyStore = useMoneeeyStore();

  const onExportData = async () => {
    const update = (newContent: string) =>
      setAction({
        title: Messages.settings.export_data,
        content: newContent,
      });
    update(Messages.settings.backup_loading(0));
    const data = await moneeeyStore.persistence.exportAll((percentage) => {
      update(Messages.settings.backup_loading(percentage));
    });
    update(data);
  };
  const onImportData = () => {
    const update = (newContent: string) =>
      setAction({
        title: Messages.settings.import_data,
        content: newContent,
        submitTitle: Messages.util.close,
        submitFn: noop,
      });
    const submitFn = async (data: Action) => {
      const input = (data && data.content) || '';
      update(Messages.settings.restore_loading(0));
      const { errors } = await moneeeyStore.persistence.restoreAll(input, (percentage) => {
        update(Messages.settings.restore_loading(percentage));
      });
      update([...errors, '', Messages.settings.reload_page].join('\n'));
    };
    setAction({
      content: Messages.settings.restore_data_placeholder,
      title: Messages.settings.import_data,
      submitFn,
      submitTitle: Messages.settings.import_data,
    });
  };

  const onClearData = () => {
    setAction({
      title: Messages.settings.clear_all,
      content: Messages.settings.clear_data_placeholder,
      submitTitle: Messages.settings.clear_all,
      submitFn: (data) => {
        if (data && data.content === Messages.settings.clear_data_token) {
          moneeeyStore.persistence.truncateAll();
          setAction({ ...data, content: Messages.settings.reload_page });
        }
      },
    });
  };

  return (
    <section className='settingsArea'>
      <Space>
        <PrimaryButton onClick={onExportData}>{Messages.settings.export_data}</PrimaryButton>
        <SecondaryButton onClick={onImportData}>{Messages.settings.import_data}</SecondaryButton>
        <SecondaryButton onClick={onClearData}>{Messages.settings.clear_all}</SecondaryButton>
        {action && (
          <Drawer {...{ 'data-test-id': 'accountSettings' }} header={action.title}>
            <TextArea
              data-test-id='importExportOutput'
              value={action.content}
              onChange={(value) => setAction((cont) => cont && { ...cont, content: value })}
              placeholder={'Data'}
            />
            <Space>
              <SecondaryButton onClick={() => setAction(undefined)} title={Messages.util.close} />
              {action.submitFn && (
                <PrimaryButton onClick={() => action.submitFn && action.submitFn(action)} title={action.submitTitle} />
              )}
            </Space>
          </Drawer>
        )}
      </Space>
      <ConfigTable config={moneeeyStore.config} />
    </section>
  );
}
