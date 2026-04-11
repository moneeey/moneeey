import { action, makeObservable, observable } from "mobx";
import PouchDB from "pouchdb";

import { StorageKind, setStorage } from "../utils/Utils";
import Logger from "./Logger";
import {
	CONFIG_DOC_ID,
	ENCRYPTED_DB_NAME,
	LOCAL_DB_NAME,
	createEncryptedPouchDB,
	verifyConfigCanary,
} from "./Persistence";

export const ENCRYPTION_INITIALIZED_KEY = "moneeey.encryption.initialized";
export const MIN_PASSPHRASE_LENGTH = 12;

export enum EncryptionStatus {
	LOCKED = "LOCKED",
	UNLOCKING = "UNLOCKING",
	UNLOCKED = "UNLOCKED",
}

/**
 * Small MobX store covering post-unlock encryption concerns: exposing the
 * status the app reacts to, locking the app (full reload), and running the
 * change-passphrase walk-and-re-encrypt flow.
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
	 * forcing a full reload. The in-memory PouchDB is wiped by the tab reload,
	 * so no further cleanup is required.
	 */
	lock() {
		this.logger.info("locking");
		window.location.reload();
	}

	/**
	 * Re-encrypt the whole database under a new passphrase. Requires the
	 * current live db (handed in by the caller so we don't hold a reference).
	 * The caller is responsible for pausing/cancelling any active sync before
	 * invoking this — otherwise in-flight replication could push stale
	 * ciphertext back to the remote.
	 */
	async changePassphrase(
		currentDb: PouchDB.Database,
		newPassphrase: string,
	): Promise<void> {
		if (newPassphrase.length < MIN_PASSPHRASE_LENGTH) {
			throw new Error("passphrase_too_short");
		}

		this.logger.info("change passphrase: exporting docs");
		const allDocs = await currentDb.allDocs({ include_docs: true });
		const docs = allDocs.rows
			.map((row) => row.doc)
			.filter((doc): doc is PouchDB.Core.ExistingDocument<object> =>
				Boolean(doc),
			)
			// Strip _rev so the new DB accepts them as fresh documents.
			.map((doc) => {
				const { _rev, ...rest } = doc as { _rev?: string } & Record<
					string,
					unknown
				>;
				return rest;
			});

		this.logger.info("change passphrase: destroying old databases");
		await (
			currentDb as unknown as {
				destroy: (opts?: object) => Promise<void>;
			}
		).destroy();
		// Also destroy any leftover encrypted mirror by name, just in case the
		// comdb destroy wrapper missed it.
		try {
			await new PouchDB(ENCRYPTED_DB_NAME).destroy();
		} catch {
			// already gone
		}
		try {
			await new PouchDB(LOCAL_DB_NAME, { adapter: "memory" }).destroy();
		} catch {
			// already gone
		}

		this.logger.info("change passphrase: recreating with new key");
		const newDb = await createEncryptedPouchDB(newPassphrase);
		await newDb.bulkDocs(docs as PouchDB.Core.PostDocument<object>[]);

		// Make sure the flag is set (should already be, but be explicit).
		setStorage(ENCRYPTION_INITIALIZED_KEY, "1", StorageKind.PERMANENT);

		this.logger.info("change passphrase: reloading");
		window.location.reload();
	}
}

/**
 * Shared helper used by the setup + unlock forms. Resolves on success with a
 * usable PouchDB, rejects with an Error whose `.message` is a stable code the
 * UI can map to a localized message.
 */
export const openEncryptedDatabase = async (
	passphrase: string,
	mode: "setup" | "unlock",
): Promise<PouchDB.Database> => {
	if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
		throw new Error("passphrase_too_short");
	}
	let db: PouchDB.Database;
	try {
		db = await createEncryptedPouchDB(passphrase);
	} catch (err) {
		// Setup should never fail at the comdb layer — any failure is a bug
		// we want to see, not a "wrong passphrase". Only unlock is allowed to
		// collapse comdb errors into the user-facing wrong-passphrase code.
		if (mode === "setup") {
			console.error("createEncryptedPouchDB failed during setup", err);
			throw err;
		}
		throw new Error("wrong_passphrase");
	}
	if (mode === "unlock") {
		const ok = await verifyConfigCanary(db);
		if (!ok) {
			// Tear down so we don't leak a memory DB instance.
			try {
				await (
					db as unknown as { destroy: (opts?: object) => Promise<void> }
				).destroy({ unencrypted_only: true });
			} catch {
				// ignore
			}
			throw new Error("wrong_passphrase");
		}
	}
	return db;
};

// Re-export for convenience at the call sites.
export { CONFIG_DOC_ID };
