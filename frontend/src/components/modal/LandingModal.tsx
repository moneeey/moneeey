import { map } from "lodash";

import { NavigationModal } from "../../shared/Navigation";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import { StorageKind, setStorage } from "../../utils/Utils";
import { useMoneeeyTour } from "../tour/Tour";

import useMessages from "../../utils/Messages";
import { OkCancel } from "../base/Button";
import Modal from "../base/Modal";

const LandingModal = () => {
	const Messages = useMessages();
	const { navigation } = useMoneeeyStore();
	const tour = useMoneeeyTour();

	return (
		<Modal
			className=""
			modalId={NavigationModal.LANDING}
			title={Messages.landing.title}
			footer={
				<OkCancel
					onOk={() => {
						setStorage("show_landing", "false", StorageKind.PERMANENT);
						navigation.closeModal();
						tour.open();
					}}
					onCancel={() => navigation.closeModal()}
					cancelTitle={Messages.util.close}
					okTitle={Messages.modal.start_tour}
				/>
			}
		>
			<ul data-testid="start_tour_messages" className="list-disc pl-8">
				{map(Messages.landing.messages, (message, index) => (
					<li data-testid={`start_tour_message_${index}`} key={message}>
						{message}
					</li>
				))}
			</ul>
		</Modal>
	);
};

export default LandingModal;
