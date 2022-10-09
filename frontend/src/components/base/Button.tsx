import { Button as AntdButton, ButtonProps } from 'antd'

import Messages from '../../utils/Messages'

import { WithDataTestId } from './Common'

const Button = (base: ButtonProps & WithDataTestId) =>
  function BaseButton(props: ButtonProps & Partial<WithDataTestId>) {
    return <AntdButton {...base} {...props} />
  }

const PrimaryButton = Button({ type: 'primary', 'data-test-id': 'primary-button' })
const SecondaryButton = Button({ type: 'default', 'data-test-id': 'secondary-button' })
const DeleteButton = Button({
  type: 'default',
  'data-test-id': 'delete-button',
  color: 'red',
  title: Messages.util.delete,
})
const CancelButton = Button({ type: 'default', 'data-test-id': 'cancel-button', title: Messages.util.cancel })
const OkButton = Button({ type: 'primary', 'data-test-id': 'ok-button', title: Messages.util.ok })
const LinkButton = Button({ type: 'link', 'data-test-id': 'link-button' })

export { PrimaryButton, SecondaryButton, OkButton, CancelButton, DeleteButton, LinkButton }
