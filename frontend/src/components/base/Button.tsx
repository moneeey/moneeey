import { Button as AntdButton, ButtonProps } from 'antd'

import Messages from '../../utils/Messages'

const Button = (base: ButtonProps) =>
  function BaseButton(props: ButtonProps) {
    return <AntdButton {...base} {...props} />
  }

const PrimaryButton = Button({ type: 'primary' })
const SecondaryButton = Button({ type: 'default' })
const DeleteButton = Button({ type: 'default', color: 'red', title: Messages.util.delete })
const CancelButton = Button({ type: 'default', title: Messages.util.cancel })
const OkButton = Button({ type: 'primary', title: Messages.util.ok })
const LinkButton = Button({ type: 'link' })

export { PrimaryButton, SecondaryButton, OkButton, CancelButton, DeleteButton, LinkButton }
