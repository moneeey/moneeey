import "fake-indexeddb/auto";
import { type LocalDoc, LocalStore } from "./LocalStore";

let storeCounter = 0;
const freshStore = async () => {
	storeCounter += 1;
	const store = new LocalStore(`moneeey-test-${storeCounter}-${Date.now()}`);
	await store.open();
	return store;
};

const doc = (id: string, seq: number, data = "cipher"): LocalDoc => ({
	_id: id,
	seq,
	updated: new Date(seq * 1000).toISOString(),
	deletedAt: null,
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
			expect(all.find((d) => d._id === "a")?.data).toBe("second");
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

	it("tracks head_seq across calls", async () => {
		const s = await freshStore();
		try {
			expect(await s.getHeadSeq()).toBe(0);
			await s.setHeadSeq(42);
			expect(await s.getHeadSeq()).toBe(42);
			await s.setHeadSeq(100);
			expect(await s.getHeadSeq()).toBe(100);
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

	it("outbox add/list/remove round trip", async () => {
		const s = await freshStore();
		try {
			await s.outboxAdd({
				_id: "a",
				updated: "2026-01-01T00:00:00Z",
				deletedAt: null,
				data: "cipher",
				enqueuedAt: new Date().toISOString(),
			});
			await s.outboxAdd({
				_id: "b",
				updated: "2026-01-02T00:00:00Z",
				deletedAt: null,
				data: "cipher2",
				enqueuedAt: new Date().toISOString(),
			});
			let list = await s.outboxList();
			expect(list.length).toBe(2);
			await s.outboxRemove("a");
			list = await s.outboxList();
			expect(list.length).toBe(1);
			expect(list[0]._id).toBe("b");
		} finally {
			await s.destroy();
		}
	});

	it("outbox addd by same id overwrites", async () => {
		const s = await freshStore();
		try {
			await s.outboxAdd({
				_id: "a",
				updated: "t1",
				deletedAt: null,
				data: "v1",
				enqueuedAt: "e1",
			});
			await s.outboxAdd({
				_id: "a",
				updated: "t2",
				deletedAt: null,
				data: "v2",
				enqueuedAt: "e2",
			});
			const list = await s.outboxList();
			expect(list.length).toBe(1);
			expect(list[0].data).toBe("v2");
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
			await s.setHeadSeq(5);
			await s.put(doc("a", 1));
			await s.clearDocs();
			expect((await s.allDocs()).length).toBe(0);
			expect(await s.getHeadSeq()).toBe(5);
		} finally {
			await s.destroy();
		}
	});

	it("allDocs returns inserted docs", async () => {
		const s = await freshStore();
		try {
			await s.bulkPut([doc("a", 1), doc("b", 2), doc("c", 3)]);
			const all = await s.allDocs();
			expect(all.map((d) => d._id).sort()).toEqual(["a", "b", "c"]);
		} finally {
			await s.destroy();
		}
	});
});
