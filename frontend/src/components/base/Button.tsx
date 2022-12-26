import { ReactNode } from 'react';

import Messages from '../../utils/Messages';

import { WithDataTestId } from './Common';
import Space from './Space';
import './Button.less';

type ButtonType = 'primary' | 'secondary' | 'link' | 'danger';

type ButtonProps = {
  onClick: () => void;
  title?: string | ReactNode;
  children?: string | ReactNode | ReactNode[];
  className?: string;
  disabled?: boolean;
};

type WithButtonKind = {
  kind: ButtonType;
};

const Button = ({ kind, ...base }: Partial<ButtonProps> & WithButtonKind & WithDataTestId) =>
  function BaseButton(props: ButtonProps & Partial<WithDataTestId>) {
    return (
      <button {...base} {...props} className={`mn-button mn-button-${kind} ${props.className || ''}`}>
        {props.title || props.children}
      </button>
    );
  };

const PrimaryButton = Button({ kind: 'primary', 'data-test-id': 'primary-button' });
const SecondaryButton = Button({ kind: 'secondary', 'data-test-id': 'secondary-button' });
const DeleteButton = Button({
  kind: 'danger',
  'data-test-id': 'delete-button',
  title: Messages.util.delete,
});
const CancelButton = Button({ kind: 'secondary', 'data-test-id': 'cancel-button', title: Messages.util.cancel });
const OkButton = Button({ kind: 'primary', 'data-test-id': 'ok-button', title: Messages.util.ok });
const LinkButton = Button({ kind: 'link', 'data-test-id': 'link-button' });

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
