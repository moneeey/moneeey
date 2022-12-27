import { observer } from 'mobx-react';
import { ReactElement, ReactNode } from 'react';
import { XCircleIcon } from '@heroicons/react/24/outline';

import { NavigationModal } from '../../shared/Navigation';
import useMoneeeyStore from '../../shared/useMoneeeyStore';

import Card from './Card';
import './Modal.less';
import { TextTitle } from './Text';

interface ModalProps {
  title: string;
  footer: ReactNode;
  onClose?: () => void;
  isOpen?: boolean;
  modalId?: NavigationModal;
  children: ReactElement | ReactElement[];
  className?: string;
}

const Modal = observer(({ title, modalId, footer, onClose, isOpen, children, className }: ModalProps) => {
  const { navigation } = useMoneeeyStore();

  const onCloseFn = () => (onClose && onClose()) || navigation.closeModal();

  const visible = isOpen === true || (modalId && navigation.modal === modalId);

  return visible ? (
    <article className={`mn-modal ${className || ''}`}>
      <Card
        header={
          <div className='title'>
            <TextTitle>{title}</TextTitle>
            <span className='close'>
              <XCircleIcon className='icon' onClick={onCloseFn} />
            </span>
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
