import { action, makeObservable, observable } from "mobx";

import Logger from "./Logger";
import {
	type EncryptionErrorCode,
	type MetaStore,
	changePassphrase as changePassphraseInMeta,
	encryptionError,
	setupNewEncryption,
	unlockExistingEncryption,
	verifyPassphrase,
} from "./encryption/codec";

export const MIN_PASSPHRASE_LENGTH = 8;

export default class EncryptionStore {
	private logger: Logger;

	// MobX placeholder — promote to a real field if reactive state is needed.
	_tick = 0;
	bump() {
		this._tick += 1;
	}

	constructor(parent: Logger) {
		this.logger = new Logger("encryption", parent);
		makeObservable(this, { _tick: observable, bump: action });
	}

	lock() {
		window.location.reload();
	}

	async changePassphrase(
		store: MetaStore,
		currentDataKey: CryptoKey,
		newPassphrase: string,
	): Promise<void> {
		if (newPassphrase.length < MIN_PASSPHRASE_LENGTH) {
			throw encryptionError("passphrase_too_short");
		}
		await changePassphraseInMeta(store, currentDataKey, newPassphrase);
		window.location.reload();
	}
}

export const openEncryptedDatabase = async (
	store: MetaStore,
	passphrase: string,
	mode: "setup" | "unlock",
): Promise<CryptoKey> => {
	if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
		throw encryptionError("passphrase_too_short");
	}
	return mode === "setup"
		? setupNewEncryption(store, passphrase)
		: unlockExistingEncryption(store, passphrase);
};

export type { EncryptionErrorCode };
export { verifyPassphrase };
