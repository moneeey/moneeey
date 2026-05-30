import { fs } from "../deps.ts";
import { assert } from "../test.ts";
import { SqlitePerVaultEngine } from "./storage.ts";

const makeStorage = () => {
	const root = Deno.makeTempDirSync({ prefix: "moneeey-storage-test-" });
	const storage = new SqlitePerVaultEngine({
		metaPath: `${root}/meta.sqlite`,
		vaultsDir: `${root}/vaults`,
		maxCachedHandles: 3,
	});
	return { root, storage };
};

const cleanup = (root: string, storage: SqlitePerVaultEngine) => {
	storage.closeAll();
	Deno.removeSync(root, { recursive: true });
};

Deno.test(function vaultPathShardsByFirstFourChars() {
	const { root, storage } = makeStorage();
	try {
		const id = "abcdefghijklmnop";
		assert.assertEquals(
			storage.vaultPath(id),
			`${root}/vaults/ab/cd/${id}.sqlite`,
		);
	} finally {
		cleanup(root, storage);
	}
});

Deno.test(function vaultPathRejectsShortIds() {
	const { root, storage } = makeStorage();
	try {
		assert.assertThrows(() => storage.vaultPath("abc"));
	} finally {
		cleanup(root, storage);
	}
});

Deno.test(async function withMetaCreatesFileAndAppliesMigrations() {
	const { root, storage } = makeStorage();
	try {
		await storage.withMeta((conn) =>
			conn.run(
				"INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?)",
				"u1",
				"Alice",
				new Date().toISOString(),
			),
		);
		assert.assertEquals(fs.existsSync(`${root}/meta.sqlite`), true);
		const row = await storage.withMeta((conn) =>
			conn.get<{ display_name: string }>(
				"SELECT display_name FROM users WHERE id = ?",
				"u1",
			),
		);
		assert.assertEquals(row?.display_name, "Alice");
	} finally {
		cleanup(root, storage);
	}
});

Deno.test(async function withVaultCreatesShardedFileAndAppliesMigrations() {
	const { root, storage } = makeStorage();
	try {
		const id = "abcdefghijklmnopqrstu";
		await storage.withVault(id, (conn) =>
			conn.run(
				"INSERT INTO documents (vault_id, id, updated_at, deleted_at, data) VALUES (?, ?, ?, NULL, ?)",
				id,
				"doc1",
				new Date().toISOString(),
				"cipher",
			),
		);
		const expectedPath = `${root}/vaults/ab/cd/${id}.sqlite`;
		assert.assertEquals(fs.existsSync(expectedPath), true);
		const row = await storage.withVault(id, (conn) =>
			conn.get<{ data: string }>(
				"SELECT data FROM documents WHERE vault_id = ? AND id = ?",
				id,
				"doc1",
			),
		);
		assert.assertEquals(row?.data, "cipher");
	} finally {
		cleanup(root, storage);
	}
});

Deno.test(async function vaultHandleIsCachedAcrossCalls() {
	const { root, storage } = makeStorage();
	try {
		const id = "abcdefghijklmnopqrstu";
		await storage.withVault(id, () => Promise.resolve());
		assert.assertEquals(storage.cachedVaultCount(), 1);
		await storage.withVault(id, () => Promise.resolve());
		assert.assertEquals(storage.cachedVaultCount(), 1);
	} finally {
		cleanup(root, storage);
	}
});

Deno.test(async function lruEvictsOldestWhenCapExceeded() {
	const { root, storage } = makeStorage();
	try {
		const ids = [
			"aaaaaaaaaaaaaaaaaaaaa",
			"bbbbbbbbbbbbbbbbbbbbb",
			"ccccccccccccccccccccc",
			"ddddddddddddddddddddd",
		];
		for (const id of ids) {
			await storage.withVault(id, () => Promise.resolve());
		}
		assert.assertEquals(storage.cachedVaultCount(), 3);
	} finally {
		cleanup(root, storage);
	}
});

Deno.test(async function recentAccessKeepsHandleHotInLru() {
	const { root, storage } = makeStorage();
	try {
		const a = "aaaaaaaaaaaaaaaaaaaaa";
		const b = "bbbbbbbbbbbbbbbbbbbbb";
		const c = "ccccccccccccccccccccc";
		const d = "ddddddddddddddddddddd";
		await storage.withVault(a, () => Promise.resolve());
		await storage.withVault(b, () => Promise.resolve());
		await storage.withVault(c, () => Promise.resolve());
		await storage.withVault(a, () => Promise.resolve());
		await storage.withVault(d, () => Promise.resolve());

		const aRow = await storage.withVault(a, (conn) =>
			conn.get<{ name: string }>(
				"SELECT name FROM sqlite_master WHERE name = 'documents'",
			),
		);
		assert.assertEquals(aRow?.name, "documents");
		assert.assertEquals(storage.cachedVaultCount(), 3);
	} finally {
		cleanup(root, storage);
	}
});

Deno.test(async function reopeningExistingFileIsNoOpForMigrations() {
	const { root, storage } = makeStorage();
	try {
		const id = "abcdefghijklmnopqrstu";
		await storage.withVault(id, (conn) =>
			conn.run(
				"INSERT INTO documents (vault_id, id, updated_at, deleted_at, data) VALUES (?, ?, ?, NULL, '')",
				id,
				"doc1",
				new Date().toISOString(),
			),
		);
		storage.closeAll();

		const reopened = new SqlitePerVaultEngine({
			metaPath: `${root}/meta.sqlite`,
			vaultsDir: `${root}/vaults`,
		});
		try {
			const row = await reopened.withVault(id, (conn) =>
				conn.get<{ id: string }>(
					"SELECT id FROM documents WHERE vault_id = ? AND id = ?",
					id,
					"doc1",
				),
			);
			assert.assertEquals(row?.id, "doc1");
			const applied = await reopened.withVault(id, async (conn) => {
				const rows = await conn.query<{ name: string }>(
					"SELECT name FROM schema_migrations ORDER BY name",
				);
				return rows.map((r) => r.name);
			});
			assert.assertEquals(applied, ["0001_init"]);
		} finally {
			reopened.closeAll();
		}
	} finally {
		Deno.removeSync(root, { recursive: true });
	}
});

Deno.test(async function bootingTwiceAppliesMigrationsOnlyOnce() {
	const root = Deno.makeTempDirSync({ prefix: "moneeey-boot-test-" });
	try {
		const first = new SqlitePerVaultEngine({
			metaPath: `${root}/meta.sqlite`,
			vaultsDir: `${root}/vaults`,
		});
		await first.withMeta(() => Promise.resolve());
		first.closeAll();

		const second = new SqlitePerVaultEngine({
			metaPath: `${root}/meta.sqlite`,
			vaultsDir: `${root}/vaults`,
		});
		try {
			const applied = await second.withMeta(async (conn) => {
				const rows = await conn.query<{ name: string }>(
					"SELECT name FROM schema_migrations ORDER BY name",
				);
				return rows.map((r) => r.name);
			});
			assert.assertEquals(applied, ["0001_init"]);
		} finally {
			second.closeAll();
		}
	} finally {
		Deno.removeSync(root, { recursive: true });
	}
});
