import { map } from 'lodash';
import { useEffect } from 'react';

import { NavigationModal } from '../../shared/Navigation';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';
import { StorageKind, getStorage, setStorage } from '../../utils/Utils';
import { useMoneeeyTour } from '../tour/Tour';

import Modal from '../base/Modal';
import { OkCancel } from '../base/Button';

import './LandingModal.less';

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
      <ul className='start_tour_messages' data-test-id='start_tour_messages'>
        {map(Messages.landing.messages, (message, index) => (
          <li data-test-id={`start_tour_message_${index}`} key={message}>
            {message}
          </li>
        ))}
      </ul>
    </Modal>
  );
};

export { LandingModal, LandingModal as default };
