import { ButtonProps, Modal } from 'antd';
import { observer } from 'mobx-react';
import { ReactElement } from 'react';

import { NavigationModal } from '../../shared/Navigation';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

interface BaseModalProps {
  modalId: NavigationModal;
  title: string;
  okText?: string;
  cancelText?: string;
  onSubmit: () => void;
  children: ReactElement | ReactElement[];
}

const BaseModal = observer(({ title, modalId, onSubmit, okText, cancelText, children }: BaseModalProps) => {
  const { navigation } = useMoneeeyStore();

  return (
    <Modal
      title={<span data-test-id='modalTitle'>{title}</span>}
      open={navigation.modal === modalId}
      onOk={onSubmit}
      okText={okText || Messages.util.ok}
      okButtonProps={{ 'data-test-id': 'button-ok' } as ButtonProps}
      onCancel={() => navigation.closeModal()}
      cancelButtonProps={{ 'data-test-id': 'button-cancel' } as ButtonProps}
      cancelText={cancelText || Messages.util.cancel}>
      {children}
    </Modal>
  );
});

export { BaseModal, BaseModal as default };
