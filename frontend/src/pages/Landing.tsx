import { Button, Input, Space } from 'antd'
import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { StatusProps, Status } from '../components/Status'
import Messages from '../utils/Messages'
import useMoneeeyStore from '../shared/useMoneeeyStore'

export default function Landing() {
  const { management } = useMoneeeyStore()
  const [email, setEmail] = React.useState('')
  const [disabled, setDisabled] = React.useState(false)
  const [status, setStatus] = React.useState<StatusProps>()
  const [searchParams, setSearchParams] = useSearchParams()

  const onRegisterOrLogin = async () => {
    setDisabled(true)
    setStatus({})
    if (await management.start(email)) {
      setStatus({ type: 'success', message: Messages.landing.welcome })
      const tmr = setInterval(async () => {
        if (await management.checkLoggedIn()) {
          clearInterval(tmr)
        }
      }, 2000)
    } else {
      setStatus({ type: 'error', message: Messages.landing.failed })
    }
    setDisabled(false)
  }

  useEffect(() => {
    management.checkLoggedIn()
  }, [management])

  useEffect(() => {
    if (searchParams.has('confirm_code')) {
      (async () => {
        const email = searchParams.get('email') || ''
        const auth_code = searchParams.get('auth_code') || ''
        const confirm_code = searchParams.get('confirm_code') || ''
        setSearchParams({})
        const { success, error } = await management.complete(email, auth_code, confirm_code)
        if (!success && error) {
          let message
          if (error === 'code_expired') {
            message = Messages.login.code_expired
          } else if (error === 'confirm_code') {
            message = Messages.login.confirm_code
          } else if (error === 'auth_code') {
            message = Messages.login.auth_code
          }
          if (message) {
            setStatus({ type: 'error', message })
          }
        } else if (success) {
          setStatus({ type: 'success', message: Messages.login.completed })
        }
      })()
    }
  }, [searchParams, setSearchParams, management])

  return (
    <section className='landing'>
      <h1>Welcome to Moneeey!</h1>
      <ul>
        <li>Own your data</li>
        <li>E2E encryption since v0</li>
        <li>Data always clustered into 2 to 4 different locations</li>
        <li>Freedom to export all data</li>
        <li>Freedom to host own CouchDb</li>
        <li>Powered by PouchDB, CouchDB, React, Typescript</li>
      </ul>
      <Space direction='vertical'>
        <Input
          type='text'
          placeholder='Email'
          value={email}
          onChange={({ target: { value } }) => setEmail(value.toLowerCase())}
        />
        <Button disabled={disabled} onClick={onRegisterOrLogin}>
          Create account / Login
        </Button>
        <Status {...status} />
      </Space>
    </section>
  )
}
