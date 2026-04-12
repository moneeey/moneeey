import { action, makeObservable, observable } from "mobx";

import Logger from "./Logger";
import {
	type EncryptionErrorCode,
	changePassphrase as changePassphraseInMeta,
	encryptionError,
	setupNewEncryption,
	unlockExistingEncryption,
	verifyPassphrase,
} from "./encryption/encryptedPouch";

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
		this.logger.info("locking");
		window.location.reload();
	}

	async changePassphrase(
		db: PouchDB.Database,
		currentDataKey: CryptoKey,
		newPassphrase: string,
	): Promise<void> {
		if (newPassphrase.length < MIN_PASSPHRASE_LENGTH) {
			throw encryptionError("passphrase_too_short");
		}
		await changePassphraseInMeta(db, currentDataKey, newPassphrase);
		window.location.reload();
	}
}

export const openEncryptedDatabase = async (
	db: PouchDB.Database,
	passphrase: string,
	mode: "setup" | "unlock",
): Promise<CryptoKey> => {
	if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
		throw encryptionError("passphrase_too_short");
	}
	return mode === "setup"
		? setupNewEncryption(db, passphrase)
		: unlockExistingEncryption(db, passphrase);
};

export type { EncryptionErrorCode };
export { verifyPassphrase };
