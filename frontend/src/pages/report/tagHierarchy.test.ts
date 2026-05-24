import {
	TAG_SEPARATOR,
	isDescendantOf,
	normalizeTag,
	tagAtDepth,
	tagDepth,
	tagLeaf,
	tagParents,
} from "./tagHierarchy";

describe("tagHierarchy", () => {
	describe("normalizeTag", () => {
		test("trims whitespace around separators", () => {
			expect(normalizeTag("food>groceries")).toBe(`food${TAG_SEPARATOR}groceries`);
			expect(normalizeTag("food >  groceries")).toBe(
				`food${TAG_SEPARATOR}groceries`,
			);
			expect(normalizeTag(" food > groceries > supermarket ")).toBe(
				`food${TAG_SEPARATOR}groceries${TAG_SEPARATOR}supermarket`,
			);
		});
		test("filters empty segments", () => {
			expect(normalizeTag("food >>  > groceries")).toBe(
				`food${TAG_SEPARATOR}groceries`,
			);
			expect(normalizeTag(" > > ")).toBe("");
		});
		test("leaves flat tags unchanged", () => {
			expect(normalizeTag("transport")).toBe("transport");
		});
	});

	describe("tagParents", () => {
		test("returns all ancestor tags including self", () => {
			expect(tagParents("food > groceries > supermarket")).toEqual([
				"food",
				`food${TAG_SEPARATOR}groceries`,
				`food${TAG_SEPARATOR}groceries${TAG_SEPARATOR}supermarket`,
			]);
		});
		test("single-segment tag returns just itself", () => {
			expect(tagParents("transport")).toEqual(["transport"]);
		});
		test("empty tag returns empty array", () => {
			expect(tagParents("")).toEqual([]);
			expect(tagParents(" > > ")).toEqual([]);
		});
	});

	describe("tagDepth", () => {
		test("counts segments", () => {
			expect(tagDepth("food")).toBe(1);
			expect(tagDepth("food > groceries")).toBe(2);
			expect(tagDepth("food > groceries > supermarket")).toBe(3);
			expect(tagDepth("")).toBe(0);
		});
	});

	describe("tagAtDepth", () => {
		test("returns prefix at requested depth", () => {
			expect(tagAtDepth("food > groceries > supermarket", 1)).toBe("food");
			expect(tagAtDepth("food > groceries > supermarket", 2)).toBe(
				`food${TAG_SEPARATOR}groceries`,
			);
		});
		test("returns null when depth exceeds tag", () => {
			expect(tagAtDepth("food", 2)).toBeNull();
			expect(tagAtDepth("food", 0)).toBeNull();
		});
	});

	describe("tagLeaf", () => {
		test("returns last segment", () => {
			expect(tagLeaf("food > groceries > supermarket")).toBe("supermarket");
			expect(tagLeaf("transport")).toBe("transport");
		});
	});

	describe("isDescendantOf", () => {
		test("self counts as descendant", () => {
			expect(isDescendantOf("food", "food")).toBe(true);
		});
		test("nested tags are descendants", () => {
			expect(isDescendantOf("food > groceries", "food")).toBe(true);
			expect(isDescendantOf("food > groceries > supermarket", "food")).toBe(true);
		});
		test("unrelated tags are not descendants", () => {
			expect(isDescendantOf("transport", "food")).toBe(false);
			expect(isDescendantOf("foodstuff", "food")).toBe(false);
		});
		test("ancestor is not descendant of child", () => {
			expect(isDescendantOf("food", "food > groceries")).toBe(false);
		});
	});
});
