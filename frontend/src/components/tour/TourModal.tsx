import Messages from '../../utils/Messages';
import { OkCancel } from '../base/Button';
import Modal from '../base/Modal';

import { useMoneeeyTour } from './Tour';

export default function TourModal() {
  const tour = useMoneeeyTour();

  return (
    <Modal
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
      <span style={{ whiteSpace: 'pre-line' }}>{tour.content()}</span>
    </Modal>
  );
}
