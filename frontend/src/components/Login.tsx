import { Button, Input, Space } from 'antd'
import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { StatusProps, Status } from '../components/Status'
import Messages from '../utils/Messages'
import useMoneeeyStore from '../shared/useMoneeeyStore'

export default function Login() {
  const { management } = useMoneeeyStore()
  const [email, setEmail] = React.useState('')
  const [disabled, setDisabled] = React.useState(false)
  const [status, setStatus] = React.useState<StatusProps>()
  const [searchParams, setSearchParams] = useSearchParams()

  const onLoginOrSignup = async () => {
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
      ;(async () => {
        const email = searchParams.get('email') || ''
        const auth_code = searchParams.get('auth_code') || ''
        const confirm_code = searchParams.get('confirm_code') || ''
        setSearchParams({})
        const { success, error } = await management.complete(
          email,
          auth_code,
          confirm_code
        )
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
    <Space direction="vertical">
      <Input
        type="text"
        placeholder={Messages.login.email}
        value={email}
        onChange={({ target: { value } }) => setEmail(value.toLowerCase())}
      />
      <Button disabled={disabled} onClick={onLoginOrSignup}>
        {Messages.login.login_or_signup}
      </Button>
      <Status {...status} />
    </Space>
  )
}