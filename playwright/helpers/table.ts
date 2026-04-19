import { type Locator, type Page, expect } from "@playwright/test";
import { Input, Select } from "./page-objects";

/**
 * Returns a function that reads the CSS classes on the TD element wrapping
 * a cell with the given testId. Classes are normalized for readable assertions.
 * `bg-background-*` is shortened to `bg---*` for compactness.
 */
export const classForTestIdTDs =
	(page: Page | Locator, testId: string) => async (index: number) => {
		const className =
			(await page
				.getByTestId(`inputContainer${testId}`)
				.nth(index)
				.locator("..")
				.getAttribute("class")) ?? "";
		return className
			.replace(/\s+/g, " ")
			.replace(/bg-background-/g, "bg---")
			.replace(/[\r\n\s]+/g, " ")
			.trim();
	};

/**
 * Serializes a single table row's data into a compact string for equality checks.
 * Each column is read as either an input value or a select value depending on
 * its testId, and its normalized CSS class is appended.
 */
export async function retrieveRowData(
	page: Page,
	columns: string[],
	index: number,
) {
	const getCellData = async (column: string) => {
		const tagName = await page
			.getByTestId(column)
			.first()
			.evaluate((el) => el.tagName.toLowerCase())
			.catch(() => "div");
		const value =
			tagName === "input"
				? await Input(page, column, undefined, index).value()
				: await Select(page, column, index).value();

		const className = await classForTestIdTDs(page, column)(index);

		return `${column.replace("editor", "").toLowerCase()}: ${value} (${className})`;
	};

	const cellData = await Promise.all(
		columns.map((column) => getCellData(column)),
	);

	return cellData.join(" | ");
}

/**
 * Snapshots all rows of a table as an array of strings, one per row.
 *
 * Two modes:
 * - `retrieveRowsData(page, "tableTestId", count?)` — auto-discovers rows by
 *   walking the rendered DOM under `.${tableTestId}-body`. Works for both
 *   compact (`[data-testid="compactRow"]` with line/cell hierarchy) and full
 *   (`[data-testid="rowCell"]` cells grouped by `data-row-index`) layouts.
 *   Each row's snapshot mirrors its visible structure; lines (compact only)
 *   are joined with "\n", cells with " | ".
 * - `retrieveRowsData(page, [columnTestIds...], count?)` — legacy form: reads
 *   only the listed columns in the given order. Useful when you want a fixed
 *   shape regardless of layout changes.
 */
export async function retrieveRowsData(
	page: Page,
	tableTestIdOrColumns: string | string[],
	expectedCount?: number,
): Promise<string[]> {
	if (Array.isArray(tableTestIdOrColumns)) {
		const columns = tableTestIdOrColumns;
		if (expectedCount) {
			await expect(page.getByTestId(columns[0])).toHaveCount(expectedCount, {
				timeout: 10000,
			});
		}
		const rows = await page.getByTestId(columns[0]).all();
		return await Promise.all(
			Array.from({ length: rows.length }).map((_v, index) =>
				retrieveRowData(page, columns, index),
			),
		);
	}

	const tableTestId = tableTestIdOrColumns;
	if (expectedCount !== undefined) {
		await expect(async () => {
			const count = await page.evaluate((id) => {
				const body = document.querySelector(`.${id}-body`);
				if (!body) return 0;
				const compactRows = body.querySelectorAll(
					`[data-testid="${id}-compactRow"]`,
				);
				if (compactRows.length > 0) return compactRows.length;
				const cells = body.querySelectorAll('[data-testid="rowCell"]');
				const indices = new Set<string>();
				for (const c of Array.from(cells)) {
					const idx = c.getAttribute("data-row-index");
					if (idx !== null) indices.add(idx);
				}
				return indices.size;
			}, tableTestId);
			expect(count).toBe(expectedCount);
		}).toPass({ timeout: 10000, intervals: [200, 500, 1000] });
	}

	return await page.evaluate((id) => {
		const body = document.querySelector(`.${id}-body`);
		if (!body) return [];

		const readCellSnapshot = (cell: Element) => {
			const renderer = cell.querySelector(
				'[data-testid^="editor"]',
			) as HTMLElement | null;
			if (!renderer) return null;
			const testId = renderer.getAttribute("data-testid") ?? "";
			const inputContainer = cell.querySelector(
				`[data-testid="inputContainer${testId}"]`,
			);
			const containerParent = (inputContainer?.parentElement ??
				null) as HTMLElement | null;
			const className = (containerParent?.className ?? "")
				.replace(/\s+/g, " ")
				.replace(/bg-background-/g, "bg---")
				.trim();
			let value = "";
			if (renderer.tagName.toLowerCase() === "input") {
				value = (renderer as HTMLInputElement).value ?? "";
			} else {
				const sv = renderer.querySelector(
					".mn-select__single-value, .mn-select__placeholder",
				);
				value = sv?.textContent ?? "";
			}
			const label = testId.replace("editor", "").toLowerCase();
			return `${label}: ${value} (${className})`;
		};

		const compactRows = body.querySelectorAll(
			`[data-testid="${id}-compactRow"]`,
		);
		if (compactRows.length > 0) {
			return Array.from(compactRows).map((row) => {
				const lines = row.querySelectorAll(`[data-testid="${id}-compactLine"]`);
				return Array.from(lines)
					.map((line) =>
						Array.from(line.children)
							.map(readCellSnapshot)
							.filter((s): s is string => s !== null)
							.join(" | "),
					)
					.join("\n");
			});
		}

		const cells = Array.from(
			body.querySelectorAll('[data-testid="rowCell"]'),
		) as HTMLElement[];
		const rowsMap = new Map<number, HTMLElement[]>();
		for (const cell of cells) {
			const idx = Number(cell.getAttribute("data-row-index"));
			if (Number.isNaN(idx)) continue;
			if (!rowsMap.has(idx)) rowsMap.set(idx, []);
			rowsMap.get(idx)?.push(cell);
		}
		const sortedIndices = Array.from(rowsMap.keys()).sort((a, b) => a - b);
		return sortedIndices.map((idx) => {
			const rowCells = rowsMap.get(idx) ?? [];
			rowCells.sort(
				(a, b) =>
					Number.parseInt(a.style.left || "0", 10) -
					Number.parseInt(b.style.left || "0", 10),
			);
			return rowCells
				.map(readCellSnapshot)
				.filter((s): s is string => s !== null)
				.join(" | ");
		});
	}, tableTestId);
}
