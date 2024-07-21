import AddAccountModal from "./AddAccountModal";
import LandingModal from "./LandingModal";
import MergeAccountsModal from "./MergeAccountsModal";
import SyncModal from "./SyncModal";

const Modals = () => (
	<>
		<LandingModal />
		<SyncModal />
		<MergeAccountsModal />
		<AddAccountModal />
	</>
);

export { Modals, Modals as default };
