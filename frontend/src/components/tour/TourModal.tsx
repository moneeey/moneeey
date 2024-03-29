import useMessages from "../../utils/Messages";
import { OkCancel } from "../base/Button";
import Modal from "../base/Modal";

import { useMoneeeyTour } from "./Tour";

export default function TourModal() {
	const Messages = useMessages();
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
			}
		>
			<span className="inline-block whitespace-pre-line">{tour.content()}</span>
		</Modal>
	);
}
