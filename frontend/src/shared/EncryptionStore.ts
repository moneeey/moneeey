import { action, makeObservable, observable } from "mobx";

import Logger from "./Logger";
import { CONFIG_DOC_ID } from "./Persistence";
import {
	type EncryptionErrorCode,
	changePassphrase as changePassphraseInMeta,
	encryptionError,
	setupNewEncryption,
	unlockExistingEncryption,
	verifyPassphrase,
} from "./encryption/encryptedPouch";

export const MIN_PASSPHRASE_LENGTH = 8;

/**
 * Tiny MobX store covering post-unlock encryption concerns — exposing
 * `lock()` and `changePassphrase()`. The setup/unlock *flow* itself lives
 * in the `EncryptionGate` React component, because it happens before
 * `MoneeeyStore` exists.
 *
 * Status tracking (LOCKED / UNLOCKING / UNLOCKED) used to live here but
 * nothing observed it, so it was removed. Re-add if a later change needs a
 * reactive hook.
 */
export default class EncryptionStore {
	private logger: Logger;

	constructor(parent: Logger) {
		this.logger = new Logger("encryption", parent);
		makeObservable(this, {
			// Placeholder observable to keep MobX happy when the class has
			// no observable fields. If this becomes annoying, promote a
			// real field (e.g. a `lastError` string) to observable.
			_tick: observable,
			bump: action,
		});
	}

	_tick = 0;
	bump() {
		this._tick += 1;
	}

	/**
	 * Clear the decrypted in-memory state and return to the unlock screen
	 * by forcing a full reload. The in-memory JS state is wiped by the tab
	 * reload; the on-disk ENCRYPTION-META doc remains so the next boot
	 * lands on the unlock form.
	 */
	lock() {
		this.logger.info("locking");
		window.location.reload();
	}

	/**
	 * Re-wrap the data key under a new passphrase. The caller **must**
	 * have already verified the current passphrase (e.g. by calling
	 * `verifyPassphrase` in the Settings page). We intentionally require
	 * the caller to pass `currentDataKey` here rather than re-reading it
	 * from Persistence, so a mistaken reference can't skip the
	 * verification step.
	 *
	 * O(1) — no document walk. The updated ENCRYPTION-META replicates
	 * normally so other devices pick up the new passphrase on their next
	 * unlock. Reloads the tab so the runtime re-enters the unlock flow.
	 */
	async changePassphrase(
		db: PouchDB.Database,
		currentDataKey: CryptoKey,
		newPassphrase: string,
	): Promise<void> {
		if (newPassphrase.length < MIN_PASSPHRASE_LENGTH) {
			throw encryptionError("passphrase_too_short");
		}
		this.logger.info("change passphrase: rewrapping data key");
		await changePassphraseInMeta(db, currentDataKey, newPassphrase);
		this.logger.info("change passphrase: reloading");
		window.location.reload();
	}
}

/**
 * Shared helper used by the setup + unlock forms. Returns the data key
 * that the caller should hand to `PersistenceStore.setDataKey`. Rejects
 * with an `Error` whose `.message` is one of `EncryptionErrorCode` — the
 * UI maps those to localised messages.
 *
 * Note: the encryption transform is already installed on `db` as a
 * side-effect of both `setupNewEncryption` and `unlockExistingEncryption`,
 * so the caller does not need to touch it.
 */
export const openEncryptedDatabase = async (
	db: PouchDB.Database,
	passphrase: string,
	mode: "setup" | "unlock",
): Promise<CryptoKey> => {
	if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
		throw encryptionError("passphrase_too_short");
	}
	if (mode === "setup") {
		return setupNewEncryption(db, passphrase);
	}
	return unlockExistingEncryption(db, passphrase);
};

export type { EncryptionErrorCode };
export { verifyPassphrase, CONFIG_DOC_ID };
