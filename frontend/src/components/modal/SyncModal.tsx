import { Dispatch, SetStateAction, useState } from 'react';

import { NavigationModal } from '../../shared/Navigation';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

import Modal from '../base/Modal';
import { OkButton } from '../base/Button';
import Tabs from '../base/Tabs';
import { Checkbox, Input } from '../base/Input';
import { BaseFormEditor } from '../FormEditor';
import { StorageKind } from '../../utils/Utils';

const ConfigEditor = <TConfig extends { [key: string]: string | boolean }>({
  placeholder,
  field,
  state,
  setState,
}: {
  placeholder: string;
  field: Extract<keyof TConfig, string | boolean>;
  state: TConfig;
  setState: Dispatch<SetStateAction<TConfig>>;
}) =>
  typeof state[field] === 'boolean' ? (
    <Checkbox
      onChange={(newValue) => setState({ ...state, [field]: newValue })}
      value={state[field] as boolean}
      placeholder={placeholder}
      data-test-id={field}
      key={field}>
      {placeholder}
    </Checkbox>
  ) : (
    <Input
      onChange={(newValue) => setState({ ...state, [field]: newValue })}
      value={state[field] as string}
      placeholder={placeholder}
      data-test-id={field}
      key={field}
    />
  );

const ProvidedConfig = () => {
  const [state, setState] = useState({ email: '' });
  const onLogin = () => {
    //
  };

  return (
    <BaseFormEditor
      data-test-id='providedSync'
      items={[
        {
          label: 'Email',
          editor: <ConfigEditor field='email' state={state} setState={setState} placeholder='Email' />,
        },
        {
          label: '',
          editor: <OkButton onClick={onLogin} title='Login' />,
        },
      ]}
    />
  );
};

const SelfHostedConfig = () => {
  const { persistence, config } = useMoneeeyStore();
  const [state, setState] = useState(
    config.main.sync || {
      url: '',
      username: '',
      password: '',
      enabled: false,
    }
  );
  const syncWith = (enabled: boolean) => {
    const newState = { ...state, enabled };
    setState(newState);
    config.merge({ ...config.main, sync: newState });
    persistence.syncStart(newState);
  };
  const onLogin = () => syncWith(true);
  const onStop = () => syncWith(false);

  return (
    <BaseFormEditor
      data-test-id='selfHostedSync'
      items={[
        {
          label: 'CouchDB URL',
          editor: (
            <ConfigEditor
              field='url'
              state={state}
              setState={setState}
              placeholder='http://localcouchdb.moneeey.io/mydatabase'
            />
          ),
        },
        {
          label: 'CouchDB Username',
          editor: <ConfigEditor field='username' state={state} setState={setState} placeholder='Username' />,
        },
        {
          label: 'CouchDB Password',
          editor: <ConfigEditor field='password' state={state} setState={setState} placeholder='Password' />,
        },
        {
          label: '',
          editor: state.enabled ? (
            <OkButton onClick={onStop} title='Stop live synchronization' />
          ) : (
            <OkButton onClick={onLogin} title='Login' />
          ),
        },
      ]}
    />
  );
};

export default function SyncModal() {
  const { navigation } = useMoneeeyStore();

  return (
    <Modal
      modalId={NavigationModal.SYNC}
      title={Messages.modal.sync}
      footer={<OkButton onClick={() => navigation.closeModal()} />}>
      <>
        Synchronizing your data allows you to use Moneeey from multiple devices in real time, allowing even real time
        collaboration with related people.
        <Tabs
          data-test-id='syncSettings'
          persist={StorageKind.PERMANENT}
          items={[
            {
              key: 'provided',
              label: 'Login into Moneeey account',
              children: <ProvidedConfig />,
            },
            {
              key: 'selfhosted',
              label: 'Self-Hosted database',
              children: <SelfHostedConfig />,
            },
          ]}
        />
      </>
    </Modal>
  );
}
