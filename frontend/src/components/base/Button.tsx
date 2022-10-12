import { Button as AntdButton, ButtonProps } from 'antd';

import Messages from '../../utils/Messages';

import { WithDataTestId } from './Common';
import Space from './Space';

const Button = (base: ButtonProps & WithDataTestId) =>
  function BaseButton(props: ButtonProps & Partial<WithDataTestId>) {
    return (
      <AntdButton {...base} {...props}>
        {props.title || props.children}
      </AntdButton>
    );
  };

const PrimaryButton = Button({ type: 'primary', 'data-test-id': 'primary-button' });
const SecondaryButton = Button({ type: 'default', 'data-test-id': 'secondary-button' });
const DeleteButton = Button({
  type: 'default',
  'data-test-id': 'delete-button',
  color: 'red',
  title: Messages.util.delete,
});
const CancelButton = Button({ type: 'default', 'data-test-id': 'cancel-button', title: Messages.util.cancel });
const OkButton = Button({ type: 'primary', 'data-test-id': 'ok-button', title: Messages.util.ok });
const LinkButton = Button({ type: 'link', 'data-test-id': 'link-button' });

interface OkCancelProps {
  onOk: () => void;
  onCancel: () => void;
  okTitle?: string;
  cancelTitle?: string;
}

const OkCancel = ({ onOk, okTitle, onCancel, cancelTitle }: OkCancelProps) => (
  <Space>
    <CancelButton onClick={onCancel} title={cancelTitle || Messages.util.cancel} />
    <OkButton onClick={onOk} title={okTitle || Messages.util.ok} />
  </Space>
);

export { PrimaryButton, SecondaryButton, OkButton, CancelButton, DeleteButton, LinkButton, OkCancel };
