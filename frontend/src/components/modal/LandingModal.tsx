import { map } from 'lodash';
import { useEffect } from 'react';

import { NavigationModal } from '../../shared/Navigation';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';
import { StorageKind, getStorage, setStorage } from '../../utils/Utils';
import { useMoneeeyTour } from '../tour/Tour';

import Modal from '../base/Modal';
import { OkCancel } from '../base/Button';

const LandingModal = function () {
  const { navigation } = useMoneeeyStore();
  const tour = useMoneeeyTour();
  useEffect(() => {
    if (getStorage('show_landing', 'true', StorageKind.PERMANENT) === 'true') {
      navigation.openModal(NavigationModal.LANDING);
    }
  }, []);

  return (
    <Modal
      className=''
      modalId={NavigationModal.LANDING}
      title={Messages.landing.title}
      footer={
        <OkCancel
          onOk={() => {
            setStorage('show_landing', 'false', StorageKind.PERMANENT);
            navigation.closeModal();
            tour.open();
          }}
          onCancel={() => navigation.closeModal()}
          cancelTitle={Messages.util.close}
          okTitle={Messages.modal.start_tour}
        />
      }>
      <ul data-testid='start_tour_messages' className='list-disc pl-8'>
        {map(Messages.landing.messages, (message, index) => (
          <li data-testid={`start_tour_message_${index}`} key={message}>
            {message}
          </li>
        ))}
      </ul>
    </Modal>
  );
};

export { LandingModal, LandingModal as default };
