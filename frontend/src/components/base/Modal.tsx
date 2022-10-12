import { observer } from 'mobx-react';
import { ReactElement, ReactNode } from 'react';

import { NavigationModal } from '../../shared/Navigation';
import useMoneeeyStore from '../../shared/useMoneeeyStore';

import Card from './Card';
import './Modal.less';
import { TitleText } from './Text';

interface ModalProps {
  title: string;
  footer: ReactNode;
  onClose?: () => void;
  isOpen?: boolean;
  modalId?: NavigationModal;
  children: ReactElement | ReactElement[];
}

const Modal = observer(({ title, modalId, footer, onClose, isOpen, children }: ModalProps) => {
  const { navigation } = useMoneeeyStore();

  const onCloseFn = () => (onClose && onClose()) || navigation.closeModal();

  const visible = isOpen === true || (modalId && navigation.modal === modalId);
  const titleCloseButton = <span onClick={onCloseFn}>X</span>;

  return visible ? (
    <article className='mn-modal'>
      <Card
        header={
          <div className='title'>
            <TitleText>{title}</TitleText>
            <span className='close'>{titleCloseButton}</span>
          </div>
        }
        data-test-id='nm-modal-card'
        footer={footer}>
        {children}
      </Card>
    </article>
  ) : (
    <div />
  );
});

export { Modal, Modal as default };
