import { action, makeObservable, observable } from "mobx";

import {
	changePassphrase as changePassphraseInMeta,
	setupNewEncryption,
	unlockExistingEncryption,
} from "./encryption/encryptedPouch";
import Logger from "./Logger";
import { CONFIG_DOC_ID } from "./Persistence";

export const MIN_PASSPHRASE_LENGTH = 8;

export enum EncryptionStatus {
	LOCKED = "LOCKED",
	UNLOCKING = "UNLOCKING",
	UNLOCKED = "UNLOCKED",
}

/**
 * Small MobX store covering post-unlock encryption concerns: exposing the
 * status the app reacts to, locking the app (full reload), and running the
 * change-passphrase flow.
 *
 * The setup/unlock *flow* itself lives in the BootGate React component,
 * because it happens before MoneeeyStore exists.
 */
export default class EncryptionStore {
	public status: EncryptionStatus = EncryptionStatus.UNLOCKED;

	private logger: Logger;

	constructor(parent: Logger) {
		this.logger = new Logger("encryption", parent);
		makeObservable(this, {
			status: observable,
			setStatus: action,
		});
	}

	setStatus(status: EncryptionStatus) {
		this.status = status;
	}

	/**
	 * Clear the decrypted in-memory state and return to the unlock screen by
	 * forcing a full reload. The in-memory JS state is wiped by the tab
	 * reload; the on-disk ENCRYPTION-META doc remains so the next boot lands
	 * on the unlock form.
	 */
	lock() {
		this.logger.info("locking");
		window.location.reload();
	}

	/**
	 * Re-wrap the data key under a new passphrase. O(1) — no document walk.
	 * The updated ENCRYPTION-META replicates normally so other devices pick
	 * up the new passphrase on their next unlock. Reloads the tab so the
	 * runtime re-enters the unlock flow with the new passphrase.
	 */
	async changePassphrase(
		db: PouchDB.Database,
		currentDataKey: CryptoKey,
		newPassphrase: string,
	): Promise<void> {
		if (newPassphrase.length < MIN_PASSPHRASE_LENGTH) {
			throw new Error("passphrase_too_short");
		}
		this.logger.info("change passphrase: rewrapping data key");
		await changePassphraseInMeta(db, currentDataKey, newPassphrase);
		this.logger.info("change passphrase: reloading");
		window.location.reload();
	}
}

export type UnlockResult = {
	db: PouchDB.Database;
	dataKey: CryptoKey;
};

/**
 * Shared helper used by the setup + unlock forms. Returns the ready-to-use
 * PouchDB plus the data key (so the caller can hand the key to
 * `PersistenceStore.setDataKey`). Rejects with an `Error` whose `.message`
 * is a stable string code (`passphrase_too_short`, `wrong_passphrase`,
 * `no_meta_doc`) the UI maps to localised messages.
 */
export const openEncryptedDatabase = async (
	db: PouchDB.Database,
	passphrase: string,
	mode: "setup" | "unlock",
): Promise<UnlockResult> => {
	if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
		throw new Error("passphrase_too_short");
	}
	if (mode === "setup") {
		return setupNewEncryption(db, passphrase);
	}
	return unlockExistingEncryption(db, passphrase);
};

// Re-export for convenience at the call sites.
export { CONFIG_DOC_ID };
