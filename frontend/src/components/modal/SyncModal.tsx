import { Dispatch, ReactElement, SetStateAction, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { isEmpty } from 'lodash';

import { NavigationModal } from '../../shared/Navigation';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

import Modal from '../base/Modal';
import { LinkButton, OkButton } from '../base/Button';
import Tabs from '../base/Tabs';
import { Checkbox, Input } from '../base/Input';
import { BaseFormEditor } from '../FormEditor';
import { StorageKind } from '../../utils/Utils';
import { Status } from '../Status';
import ManagementStore, { IDatabase } from '../../shared/Management';
import { TextTitle } from '../base/Text';

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

const MoneeeyLogin = ({ setMessage }: { setMessage: Dispatch<SetStateAction<ReactElement | undefined>> }) => {
  const { management } = useMoneeeyStore();
  const [state, setState] = useState({ email: '' });

  const onLoggedIn = () => {
    setMessage(<Status type='success'>{Messages.sync.login.success}</Status>);
  };

  const onLogin = async () => {
    const { success } = await management.start(state.email, onLoggedIn);
    if (success) {
      setMessage(<Status type='info'>{Messages.sync.login.started}</Status>);
    } else {
      setMessage(<Status type='error'>{Messages.sync.login.error}</Status>);
    }
  };

  return (
    <BaseFormEditor
      data-test-id='providedSync'
      items={[
        {
          label: Messages.login.email,
          editor: <ConfigEditor field='email' state={state} setState={setState} placeholder={Messages.login.email} />,
        },
        {
          label: '',
          editor: <OkButton onClick={onLogin} title={Messages.login.login_or_signup} />,
        },
      ]}
    />
  );
};

const loadDatabases = async (management: ManagementStore): Promise<IDatabase[]> => {
  const { databases } = await management.listDatabases();
  if (isEmpty(databases)) {
    await management.createDatabase('Default');

    return loadDatabases(management);
  }

  return databases;
};

const MoneeeyAccount = ({ setMessage }: { setMessage: Dispatch<SetStateAction<ReactElement | undefined>> }) => {
  const { management } = useMoneeeyStore();
  const [state, setState] = useState({ databases: [] as IDatabase[] });

  useEffect(() => {
    (async () => {
      const databases = await loadDatabases(management);
      setState({ ...state, databases });
    })();
  }, []);

  const onLogout = () => management.logout();
  const onSelectDb = (db: IDatabase) => alert(db.description);

  return (
    <>
      <TextTitle>Databases</TextTitle>
      <ul>
        {state.databases.map((db) => (
          <li key={db.database_id}>
            {db.description}{' '}
            <LinkButton
              onClick={() => {
                onSelectDb(db);
              }}
              title={Messages.sync.select_db}
            />
          </li>
        ))}
      </ul>
      <OkButton onClick={onLogout} title={Messages.login.logout} />{' '}
    </>
  );
};

const MoneeeyAccountConfig = observer(() => {
  const { management } = useMoneeeyStore();
  const [message, setMessage] = useState(undefined as ReactElement | undefined);
  const showAccount = management.loggedIn;

  useEffect(() => {
    management.checkLoggedIn();
  }, []);

  return (
    <>
      {message}
      {showAccount ? <MoneeeyAccount setMessage={setMessage} /> : <MoneeeyLogin setMessage={setMessage} />}
    </>
  );
});

const DatabaseConfig = () => {
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
  const onStart = () => syncWith(true);
  const onStop = () => syncWith(false);

  return (
    <BaseFormEditor
      data-test-id='selfHostedSync'
      items={[
        {
          label: Messages.sync.couchdb.url,
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
        {
          label: '',
          editor: state.enabled ? (
            <OkButton onClick={onStop} title={Messages.sync.stop} />
          ) : (
            <OkButton onClick={onStart} title={Messages.sync.start} />
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
        <span className='white-space-preline'>{Messages.sync.intro}</span>
        <Tabs
          data-test-id='syncSettings'
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