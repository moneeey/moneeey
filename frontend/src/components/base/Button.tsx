import { ReactNode } from 'react';

import Messages from '../../utils/Messages';

import { WithDataTestId } from './Common';
import Space from './Space';

type ButtonType = 'primary' | 'secondary' | 'link' | 'danger';

type ButtonProps = {
  onClick: () => void;
  title?: string;
  children?: string | ReactNode | ReactNode[];
  className?: string;
  disabled?: boolean;
};

type WithButtonKind = {
  kind: ButtonType;
};

const styles: Record<ButtonType, string> = {
  primary: 'bg-primary-300 text-primary-900 hover:opacity-75',
  secondary: 'bg-secondary-300 text-secondary-900 hover:opacity-75',
  link: 'bg-transparent border-0 underline hover:opacity-75',
  danger: 'bg-danger-300 text-danger-900 hover:opacity-75',
};

const Button = ({ kind, ...base }: Partial<ButtonProps> & WithButtonKind & WithDataTestId) =>
  function BaseButton(props: ButtonProps & Partial<WithDataTestId>) {
    return (
      <button
        {...base}
        {...props}
        className={`flex whitespace-nowrap rounded p-2 ${styles[kind]} ${props.className || ''}`}>
        {props.children || props.title || base.title}
      </button>
    );
  };

const PrimaryButton = Button({ kind: 'primary', testId: 'primary-button' });
const SecondaryButton = Button({ kind: 'secondary', testId: 'secondary-button' });
const DeleteButton = Button({
  kind: 'danger',
 testId: 'delete-button',
  title: Messages.util.delete,
});
const CancelButton = Button({ kind: 'secondary', testId: 'cancel-button', title: Messages.util.cancel });
const OkButton = Button({ kind: 'primary', testId: 'ok-button', title: Messages.util.ok });
const LinkButton = Button({ kind: 'link', testId: 'link-button' });

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
