import { fs } from "../deps.ts";
import { assert } from "../test.ts";
import { Storage } from "./storage.ts";

const makeStorage = () => {
	const root = Deno.makeTempDirSync({ prefix: "moneeey-storage-test-" });
	const storage = new Storage({
		metaPath: `${root}/meta.sqlite`,
		vaultsDir: `${root}/vaults`,
		maxCachedHandles: 3,
	});
	return { root, storage };
};

const cleanup = (root: string, storage: Storage) => {
	storage.closeAll();
	Deno.removeSync(root, { recursive: true });
};

Deno.test(async function vaultPathShardsByFirstFourChars() {
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
		await storage.withMeta((db) => {
			db.prepare(
				"INSERT INTO users (id, email, credentials, created_at) VALUES (?, ?, '[]', ?)",
			).run("u1", "a@b.c", new Date().toISOString());
		});
		assert.assertEquals(fs.existsSync(`${root}/meta.sqlite`), true);
		const row = await storage.withMeta(
			(db) =>
				db
					.prepare("SELECT email FROM users WHERE id = ?")
					.get<{ email: string }>("u1") ?? null,
		);
		assert.assertEquals(row?.email, "a@b.c");
	} finally {
		cleanup(root, storage);
	}
});

Deno.test(async function withVaultCreatesShardedFileAndAppliesMigrations() {
	const { root, storage } = makeStorage();
	try {
		const id = "abcdefghijklmnopqrstu";
		await storage.withVault(id, (db) => {
			db.prepare(
				"INSERT INTO documents (id, seq, updated_at, deleted_at, data) VALUES (?, ?, ?, NULL, ?)",
			).run("doc1", 1, new Date().toISOString(), "cipher");
		});
		const expectedPath = `${root}/vaults/ab/cd/${id}.sqlite`;
		assert.assertEquals(fs.existsSync(expectedPath), true);
		const row = await storage.withVault(id, (db) =>
			db
				.prepare("SELECT data FROM documents WHERE id = ?")
				.get<{ data: string }>("doc1"),
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
		await storage.withVault(id, () => {});
		assert.assertEquals(storage.cachedVaultCount(), 1);
		await storage.withVault(id, () => {});
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
			await storage.withVault(id, () => {});
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
		await storage.withVault(a, () => {});
		await storage.withVault(b, () => {});
		await storage.withVault(c, () => {});
		await storage.withVault(a, () => {});
		await storage.withVault(d, () => {});

		const aRow = await storage.withVault(a, (db) =>
			db
				.prepare("SELECT name FROM sqlite_master WHERE name = 'documents'")
				.get<{ name: string }>(),
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
		await storage.withVault(id, (db) => {
			db.prepare(
				"INSERT INTO documents (id, seq, updated_at, deleted_at, data) VALUES (?, 1, ?, NULL, '')",
			).run("doc1", new Date().toISOString());
		});
		storage.closeAll();

		const reopened = new Storage({
			metaPath: `${root}/meta.sqlite`,
			vaultsDir: `${root}/vaults`,
		});
		try {
			const row = await reopened.withVault(id, (db) =>
				db
					.prepare("SELECT id FROM documents WHERE id = ?")
					.get<{ id: string }>("doc1"),
			);
			assert.assertEquals(row?.id, "doc1");
			const applied = await reopened.withVault(id, (db) =>
				db
					.prepare("SELECT name FROM schema_migrations ORDER BY name")
					.all<{ name: string }>()
					.map((r: { name: string }) => r.name),
			);
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
		const first = new Storage({
			metaPath: `${root}/meta.sqlite`,
			vaultsDir: `${root}/vaults`,
		});
		await first.withMeta(() => {});
		first.closeAll();

		const second = new Storage({
			metaPath: `${root}/meta.sqlite`,
			vaultsDir: `${root}/vaults`,
		});
		try {
			const applied = await second.withMeta((db) =>
				db
					.prepare("SELECT name FROM schema_migrations ORDER BY name")
					.all<{ name: string }>()
					.map((r: { name: string }) => r.name),
			);
			assert.assertEquals(applied, ["0001_init"]);
		} finally {
			second.closeAll();
		}
	} finally {
		Deno.removeSync(root, { recursive: true });
	}
});
