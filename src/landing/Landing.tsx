import { Button, Input, Space } from 'antd';
import React from 'react';

import { StatusProps, Status } from '../components/Status';
import Messages from '../shared/Messages';
import useMoneeeyStore from '../useMoneeeyStore';

export default function Landing() {
  const { management } = useMoneeeyStore();
  const [email, setEmail] = React.useState('')
  const [disabled, setDisabled] = React.useState(false)
  const [status, setStatus] = React.useState<StatusProps>()

  const onRegisterOrLogin = () => {
    setDisabled(true);
    setStatus({})
    // management.registerOrLogin(email)
    //   .flatMap(() => setStatus({ type: 'success', message: Messages.landing.registration_success }))
    //   .flatMap(() => setStatus({ type: 'info', message: Messages.landing.welcome_back }))
    //   .flatMapError(() => {
    //     setStatus({ type: 'error', message: Messages.landing.registration_failed })
    //     setDisabled(false);
    //   })
    //   .onEnd();
  }

  return (
    <section className="landing">
      <h1>Welcome to Moneeey!</h1>
      <p>Personal finance, budgeting, money freedom!</p>
      <h2>Goals</h2>
      <ul>
        <li>Own your data</li>
        <li>E2E encryption since v0</li>
        <li>Data always clustered into 2 to 4 different locations</li>
        <li>Freedom to export all data</li>
        <li>Freedom to host own CouchDb</li>
        <li>Powered by PouchDB, CouchDB, React, BaconJS</li>
      </ul>
      <Space direction="vertical">
        <Input type="text" placeholder="Email" value={email} onChange={({ target: { value } }) => setEmail(value.toLowerCase())} />
        <Button disabled={disabled} onClick={onRegisterOrLogin}>Create account / Login</Button>
        <Status {...status} />
      </Space>
    </section>
  );
}
