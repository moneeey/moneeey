export interface PeerSink {
	send(message: object): void;
	close(code?: number, reason?: string): void;
}

export class VaultHub {
	private peers = new Map<string, Set<PeerSink>>();

	registerPeer(vaultId: string, peer: PeerSink): () => void {
		let set = this.peers.get(vaultId);
		if (!set) {
			set = new Set();
			this.peers.set(vaultId, set);
		}
		set.add(peer);
		return () => {
			const current = this.peers.get(vaultId);
			if (!current) return;
			current.delete(peer);
			if (current.size === 0) this.peers.delete(vaultId);
		};
	}

	broadcast(vaultId: string, message: object, exclude: PeerSink): void {
		const set = this.peers.get(vaultId);
		if (!set) return;
		for (const peer of set) {
			if (peer === exclude) continue;
			try {
				peer.send(message);
			} catch {
				/* peer failure is the peer's problem; will be reaped on its own */
			}
		}
	}

	peerCount(vaultId: string): number {
		return this.peers.get(vaultId)?.size ?? 0;
	}
}
