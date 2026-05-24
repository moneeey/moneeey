import { getStorage } from "../data/storage_singleton.ts";
import { oak } from "../deps.ts";
import { Logger } from "../logger.ts";
import { type PeerSink, VaultHub } from "./hub.ts";
import { VaultProtocol } from "./protocol.ts";

const logger = Logger("sync/vault");

export const hub = new VaultHub();

export function setupVaultSync(router: oak.Router) {
	router.get("/vault", async (ctx) => {
		if (!ctx.isUpgradable) {
			ctx.response.status = oak.Status.UpgradeRequired;
			ctx.response.body = JSON.stringify({ error: "websocket required" });
			return;
		}
		const ws = ctx.upgrade();
		const peer: PeerSink = {
			send: (message) => {
				try {
					ws.send(JSON.stringify(message));
				} catch (err) {
					logger.warn("send failed", { err });
				}
			},
			close: (code, reason) => {
				try {
					ws.close(code, reason);
				} catch (err) {
					logger.warn("close failed", { err });
				}
			},
		};
		const protocol = new VaultProtocol(getStorage(), hub, peer);
		ws.onmessage = (event) => {
			protocol.handleMessage(String(event.data));
		};
		ws.onclose = () => protocol.handleClose();
		ws.onerror = (event) => {
			logger.warn("ws error", { event });
			protocol.handleClose();
		};
	});
}
