import { bulkUpsert, getDocs, getManifest } from "../data/documents.ts";
import { createInvite, findInvite, redeemInvite } from "../data/invites.ts";
import { createUser } from "../data/users.ts";
import {
	MAX_USERS_PER_VAULT,
	VaultFullError,
	addMember,
	createVaultForUser,
	deleteVault,
	userHasAccess,
} from "../data/vaults.ts";
import { assert } from "../test.ts";
import {
	type DbEngineKind,
	type StorageEngine,
	createEngine,
} from "./engine.ts";

const PG_URL = Deno.env.get("MONEEEY_PG_TEST_URL") ?? "";
const KINDS: DbEngineKind[] = PG_URL ? ["sqlite", "postgres"] : ["sqlite"];

const engineTest = (name: string, fn: () => Promise<void>) =>
	Deno.test({ name, sanitizeResources: false, sanitizeOps: false, fn });

function makeStorage(kind: DbEngineKind): {
	storage: StorageEngine;
	cleanup: () => void;
} {
	if (kind === "postgres") {
		const storage = createEngine({ kind, pgUrl: PG_URL });
		return { storage, cleanup: () => storage.closeAll() };
	}
	const root = Deno.makeTempDirSync({ prefix: "moneeey-engine-test-" });
	const storage = createEngine({ kind, sqlitePath: `${root}/moneeey.sqlite` });
	return {
		storage,
		cleanup: () => {
			storage.closeAll();
			Deno.removeSync(root, { recursive: true });
		},
	};
}

for (const kind of KINDS) {
	engineTest(
		`[${kind}] document upsert, update and stale rejection`,
		async () => {
			const { storage, cleanup } = makeStorage(kind);
			try {
				const alice = await createUser(storage, "Alice");
				const vault = await createVaultForUser(storage, alice.id, "Vault");

				const accepted = await bulkUpsert(storage, vault.id, [
					{ id: "d1", updated_at: "2026-01-01", deleted_at: null, data: "x" },
				]);
				assert.assertEquals(accepted[0].status, "accepted");

				const manifest = await getManifest(storage, vault.id);
				assert.assertEquals(manifest.length, 1);
				assert.assertEquals(manifest[0].id, "d1");
				assert.assertEquals(
					(await getDocs(storage, vault.id, ["d1"]))[0].data,
					"x",
				);

				const updated = await bulkUpsert(storage, vault.id, [
					{
						id: "d1",
						updated_at: "2026-06-01",
						deleted_at: "2026-06-01",
						data: "y",
					},
				]);
				assert.assertEquals(updated[0].status, "accepted");
				const doc = (await getDocs(storage, vault.id, ["d1"]))[0];
				assert.assertEquals(doc.data, "y");
				assert.assertEquals(doc.deleted_at, "2026-06-01");

				const stale = await bulkUpsert(storage, vault.id, [
					{ id: "d1", updated_at: "2025-01-01", deleted_at: null, data: "old" },
				]);
				assert.assertEquals(stale[0].status, "stale");
				assert.assertEquals(
					(await getDocs(storage, vault.id, ["d1"]))[0].data,
					"y",
				);
			} finally {
				cleanup();
			}
		},
	);

	engineTest(`[${kind}] vaults are isolated`, async () => {
		const { storage, cleanup } = makeStorage(kind);
		try {
			const alice = await createUser(storage, "Alice");
			const bob = await createUser(storage, "Bob");
			const va = await createVaultForUser(storage, alice.id, "A");
			const vb = await createVaultForUser(storage, bob.id, "B");

			await bulkUpsert(storage, va.id, [
				{ id: "same", updated_at: "2026-01-01", deleted_at: null, data: "a" },
			]);
			await bulkUpsert(storage, vb.id, [
				{ id: "same", updated_at: "2026-02-02", deleted_at: null, data: "b" },
			]);

			assert.assertEquals(
				(await getDocs(storage, va.id, ["same"]))[0].data,
				"a",
			);
			assert.assertEquals(
				(await getDocs(storage, vb.id, ["same"]))[0].data,
				"b",
			);
			assert.assertEquals((await getManifest(storage, va.id)).length, 1);
		} finally {
			cleanup();
		}
	});

	engineTest(`[${kind}] invite round-trip and vault deletion`, async () => {
		const { storage, cleanup } = makeStorage(kind);
		try {
			const owner = await createUser(storage, "Owner");
			const guest = await createUser(storage, "Guest");
			const vault = await createVaultForUser(storage, owner.id, "Vault");

			const token = await createInvite(storage, owner.id, vault.id);
			assert.assertEquals(
				(await findInvite(storage, token))?.vaultId,
				vault.id,
			);
			assert.assertEquals(
				await redeemInvite(storage, token, guest.id),
				vault.id,
			);
			assert.assertEquals(
				await userHasAccess(storage, guest.id, vault.id),
				true,
			);

			await bulkUpsert(storage, vault.id, [
				{ id: "d1", updated_at: "2026-01-01", deleted_at: null, data: "x" },
			]);
			await deleteVault(storage, vault.id);
			assert.assertEquals((await getManifest(storage, vault.id)).length, 0);
			assert.assertEquals(
				await userHasAccess(storage, owner.id, vault.id),
				false,
			);
		} finally {
			cleanup();
		}
	});

	engineTest(`[${kind}] membership cap is enforced`, async () => {
		const { storage, cleanup } = makeStorage(kind);
		try {
			const owner = await createUser(storage, "Owner");
			const vault = await createVaultForUser(storage, owner.id, "Vault");
			for (let i = 1; i < MAX_USERS_PER_VAULT; i++) {
				const member = await createUser(storage, `member-${i}`);
				await addMember(storage, vault.id, member.id);
			}
			const extra = await createUser(storage, "Extra");
			await assert.assertRejects(
				() => addMember(storage, vault.id, extra.id),
				VaultFullError,
			);
		} finally {
			cleanup();
		}
	});
}
