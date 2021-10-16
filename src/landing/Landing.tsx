import { Button, Input, Alert } from "antd";
import React from "react";
import Messages from "../shared/Messages";
import useMoneeeyStore from "../useMoneeeyStore";

export default function Landing() {
  const { management } = useMoneeeyStore();
  const [email, setEmail] = React.useState('')
  const [disabled, setDisabled] = React.useState(false)
  const [status, setStatus] = React.useState(undefined as (React.ReactChild | undefined))
  const onRegisterOrLogin = () => {
    setDisabled(true);
    setStatus(undefined);
    management.registerOrLogin(email)
      .flatMap(() => setStatus(<Alert type="success" message={Messages.landing.registration_success} />))
      .flatMap(() => setStatus(<Alert type="info" message={Messages.landing.welcome_back} />))
      .flatMapError(() => {
        setStatus(<Alert type="error" message={Messages.landing.registration_failed} />)
        setDisabled(false);
      })
      .onEnd();
  }

  return (
    <section>
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
      <Input type="text" placeholder="Email" value={email} onChange={({target: { value }}) => setEmail(value)}/>
      <Button disabled={disabled} onClick={onRegisterOrLogin}>Create account / Login</Button>
      {status}
    </section>
  );
}
