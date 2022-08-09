import { Alert } from 'antd'

interface StatusProps {
  type?: 'error' | 'success' | 'info' | 'warning';
  message?: string;
}

const Status = (props: StatusProps) => {
  if (props.message) {
    return <Alert type={props.type} message={props.message} />
  }
  return null
}

export type { StatusProps }

export { Status }
