import { registerSW } from "virtual:pwa-register";
import { includes } from "lodash";

export const autoReload = () => {
	registerSW({ immediate: true });
};

export const askConfirm = () => {
	const updateSW = registerSW({
		onNeedRefresh() {
			// eslint-disable-next-line no-alert
			if (confirm("New Moneeey version is available, update?")) {
				updateSW(true);
			}
		},
	});
};

export default function initSw() {
	if (
		!includes(["local.moneeey.io", "127.0.0.1:42069"], window.location.host)
	) {
		autoReload();
	}
}
