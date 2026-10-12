import type { Application } from "express";
import { getStorage } from "../data/storage_singleton.ts";
import { Logger } from "../logger.ts";
import { metrics } from "../metrics.ts";
import { type PeerSink, VaultHub } from "./hub.ts";
import { VaultProtocol } from "./protocol.ts";

const logger = Logger("sync/vault");

const hub = new VaultHub();

export function setupVaultSync(app: Application) {
	app.get("/api/vault", (_req, res) => {
		res.status(426).json({ error: "websocket required" });
	});

	app.ws("/api/vault", (ws) => {
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
		metrics.wsConnections.inc();
		let closed = false;
		const onClosed = () => {
			if (closed) return;
			closed = true;
			metrics.wsConnections.dec();
			protocol.handleClose();
		};
		ws.on("message", (data) => {
			protocol.handleMessage(String(data));
		});
		ws.on("close", onClosed);
		ws.on("error", (event) => {
			logger.warn("ws error", { event });
			onClosed();
		});
	});
}
