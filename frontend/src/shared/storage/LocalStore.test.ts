import "fake-indexeddb/auto";
import { type LocalDoc, LocalStore } from "./LocalStore";

let storeCounter = 0;
const freshStore = async () => {
	storeCounter += 1;
	const store = new LocalStore(`moneeey-test-${storeCounter}-${Date.now()}`);
	await store.open();
	return store;
};

const doc = (id: string, t: number, data = "cipher"): LocalDoc => ({
	id,
	updated_at: new Date(t * 1000).toISOString(),
	deleted_at: null,
	data,
});

describe("LocalStore", () => {
	it("returns undefined for missing docs", async () => {
		const s = await freshStore();
		try {
			expect(await s.get("nope")).toBeUndefined();
		} finally {
			await s.destroy();
		}
	});

	it("puts and gets a doc", async () => {
		const s = await freshStore();
		try {
			const d = doc("a", 1);
			await s.put(d);
			expect(await s.get("a")).toEqual(d);
		} finally {
			await s.destroy();
		}
	});

	it("bulkPut overwrites existing docs by id", async () => {
		const s = await freshStore();
		try {
			await s.put(doc("a", 1, "first"));
			await s.bulkPut([doc("a", 2, "second"), doc("b", 3, "b1")]);
			const all = await s.allDocs();
			expect(all.length).toBe(2);
			expect(all.find((d) => d.id === "a")?.data).toBe("second");
		} finally {
			await s.destroy();
		}
	});

	it("delete removes a doc", async () => {
		const s = await freshStore();
		try {
			await s.put(doc("a", 1));
			await s.delete("a");
			expect(await s.get("a")).toBeUndefined();
		} finally {
			await s.destroy();
		}
	});

	it("tracks vaultId", async () => {
		const s = await freshStore();
		try {
			expect(await s.getVaultId()).toBeUndefined();
			await s.setVaultId("abcdef");
			expect(await s.getVaultId()).toBe("abcdef");
		} finally {
			await s.destroy();
		}
	});

	it("manifest returns id + updated_at, skipping encryption meta", async () => {
		const s = await freshStore();
		try {
			await s.bulkPut([doc("a", 1), doc("b", 2)]);
			await s.setEncryptionMeta({
				schema_version: 1,
				kdf: "PBKDF2",
				iterations: 1,
				hash: "SHA-256",
				salt: "s",
				wrapped_key: "w",
			});
			const manifest = await s.manifest();
			const ids = manifest.map((e) => e.id).sort();
			expect(ids).toEqual(["a", "b"]);
		} finally {
			await s.destroy();
		}
	});

	it("getMany returns docs in any order; missing ids skipped", async () => {
		const s = await freshStore();
		try {
			await s.bulkPut([doc("a", 1), doc("b", 2)]);
			const got = await s.getMany(["a", "missing", "b"]);
			expect(got.map((d) => d.id).sort()).toEqual(["a", "b"]);
		} finally {
			await s.destroy();
		}
	});

	it("destroy then reopen reads empty", async () => {
		const s = await freshStore();
		await s.put(doc("a", 1));
		await s.destroy();
		const s2 = new LocalStore(s.name as unknown as string);
		await s2.open();
		try {
			expect((await s2.allDocs()).length).toBe(0);
		} finally {
			await s2.destroy();
		}
	});

	it("clearDocs leaves meta intact", async () => {
		const s = await freshStore();
		try {
			await s.setVaultId("v1");
			await s.put(doc("a", 1));
			await s.clearDocs();
			expect((await s.allDocs()).length).toBe(0);
			expect(await s.getVaultId()).toBe("v1");
		} finally {
			await s.destroy();
		}
	});

	it("allDocs returns inserted docs", async () => {
		const s = await freshStore();
		try {
			await s.bulkPut([doc("a", 1), doc("b", 2), doc("c", 3)]);
			const all = await s.allDocs();
			expect(all.map((d) => d.id).sort()).toEqual(["a", "b", "c"]);
		} finally {
			await s.destroy();
		}
	});
});
