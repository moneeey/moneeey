import { Dispatch, ReactElement, SetStateAction, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { isEmpty } from 'lodash';

import { NavigationModal } from '../../shared/Navigation';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

import Modal from '../base/Modal';
import { CancelButton, LinkButton, OkButton } from '../base/Button';
import Tabs from '../base/Tabs';
import { Checkbox, Input } from '../base/Input';
import { BaseFormEditor } from '../FormEditor';
import { StorageKind } from '../../utils/Utils';
import { Status } from '../Status';

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
      testId={field}
      key={field}>
      {placeholder}
    </Checkbox>
  ) : (
    <Input
      onChange={(newValue) => setState({ ...state, [field]: newValue })}
      value={state[field] as string}
      placeholder={placeholder}
      testId={field}
      key={field}
    />
  );

const MoneeeyLogin = ({ setMessage }: { setMessage: Dispatch<SetStateAction<ReactElement | undefined>> }) => {
  const { management } = useMoneeeyStore();
  const [state, setState] = useState({ email: '' });

  const onLogin = async () => {
    const success = await management.start(state.email);
    if (success) {
      setMessage(<Status type='info'>{Messages.sync.login.started}</Status>);
    } else {
      setMessage(<Status type='error'>{Messages.sync.login.error}</Status>);
    }
  };

  return (
    <BaseFormEditor
      testId='providedSync'
      items={[
        {
          label: Messages.login.email,
          editor: <ConfigEditor field='email' state={state} setState={setState} placeholder={Messages.login.email} />,
        },
      ]}
      footer={<OkButton onClick={onLogin} title={Messages.login.login_or_signup} />}
    />
  );
};

const MoneeeyAccountConfig = observer(() => {
  const { management } = useMoneeeyStore();
  const [message, setMessage] = useState(undefined as ReactElement | undefined);
  const loggedIn = management.loggedIn;

  const onLogout = () => management.logout()

  return (
    <>
      {message}
      {loggedIn ? <OkButton onClick={onLogout} title={Messages.login.logout} /> : <MoneeeyLogin setMessage={setMessage} />}
    </>
  );
});

const DatabaseConfig = () => {
  const { persistence, config } = useMoneeeyStore();
  const [state, setState] = useState(
    config.main.couchSync || {
      url: '',
      username: '',
      password: '',
      enabled: false,
    }
  );
  const syncWith = (enabled: boolean) => {
    const newState = { ...state, enabled };
    setState(newState);
    config.merge({ ...config.main, couchSync: newState });
    persistence.sync(newState);
  };
  const onStart = () => syncWith(true);
  const onStop = () => syncWith(false);

  return (
    <BaseFormEditor
      testId='selfHostedSync'
      items={[
        {
          label: Messages.sync.couchdb.url,
          editor: (
            <ConfigEditor
              field='url'
              state={state}
              setState={setState}
              placeholder='http://localcouchdb.moneeey.io:4280/mydatabase'
            />
          ),
        },
        {
          label: Messages.sync.couchdb.username,
          editor: (
            <ConfigEditor
              field='username'
              state={state}
              setState={setState}
              placeholder={Messages.sync.couchdb.username}
            />
          ),
        },
        {
          label: Messages.sync.couchdb.password,
          editor: (
            <ConfigEditor
              field='password'
              state={state}
              setState={setState}
              placeholder={Messages.sync.couchdb.password}
            />
          ),
        },
      ]}
      footer={
        state.enabled ? (
          <OkButton onClick={onStop} title={Messages.sync.stop} />
        ) : (
          <OkButton onClick={onStart} title={Messages.sync.start} />
        )
      }
    />
  );
};

export default function SyncModal() {
  const { navigation } = useMoneeeyStore();

  return (
    <Modal
      modalId={NavigationModal.SYNC}
      title={Messages.modal.sync}
      footer={<CancelButton onClick={() => navigation.closeModal()} title={Messages.util.close} />}>
      <>
        <span className='white-space-preline'>{Messages.sync.intro}</span>
        <Tabs
          testId='syncSettings'
          persist={StorageKind.PERMANENT}
          items={[
            {
              key: 'moneeeyAccount',
              label: Messages.sync.moneeey_account,
              children: <MoneeeyAccountConfig />,
            },
            {
              key: 'database',
              label: Messages.sync.database,
              children: <DatabaseConfig />,
            },
          ]}
        />
      </>
    </Modal>
  );
}
