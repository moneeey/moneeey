import LandingModal from "./LandingModal";
import MergeAccountsModal from "./MergeAccountsModal";
import SyncModal from "./SyncModal";

const Modals = function () {
	return (
		<>
			<LandingModal />
			<SyncModal />
			<MergeAccountsModal />
		</>
	);
};

export { Modals, Modals as default };
