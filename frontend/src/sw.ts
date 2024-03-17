import { registerSW } from "virtual:pwa-register";
import { includes } from "lodash";

export default function initSw() {
	if (
		!includes(["local.moneeey.io", "127.0.0.1:42069"], window.location.host)
	) {
		registerSW({ immediate: true })
  }
}
