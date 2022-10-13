import Messages from '../../utils/Messages';
import { OkCancel } from '../base/Button';
import Modal from '../base/Modal';

import { useMoneeeyTour } from './Tour';

import './TourModal.less';

export default function TourModal() {
  const tour = useMoneeeyTour();

  return (
    <Modal
      className='tour'
      title={Messages.tour.welcome}
      isOpen={tour.isOpen()}
      onClose={() => tour.close()}
      footer={
        <OkCancel
          onOk={() => tour.nextStep()}
          onCancel={() => tour.prevStep()}
          cancelTitle={Messages.tour.prev}
          okTitle={Messages.tour.next}
        />
      }>
      <span className='content'>{tour.content()}</span>
    </Modal>
  );
}
