import { type Page, expect } from "@playwright/test";
import { Input, Select } from "./page-objects";

/**
 * Returns a function that reads the CSS classes on the TD element wrapping
 * a cell with the given testId. Classes are normalized for readable assertions.
 * `bg-background-*` is shortened to `bg---*` for compactness.
 */
export const classForTestIdTDs =
	(page: Page, testId: string) => async (index: number) => {
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
 * If expectedCount is provided, waits for that many rows before reading.
 */
export async function retrieveRowsData(
	page: Page,
	columns: string[],
	expectedCount?: number,
) {
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

/**
 * Walks the rendered compact-mode table by `tableTestId`, discovering rows,
 * lines and cells from the DOM. Returns one snapshot string per row, with
 * lines separated by "\n" and cells separated by " | " — mirroring the
 * structure of the table's compactLayout without the test having to declare it.
 */
export async function retrieveCompactRowsData(
	page: Page,
	tableTestId: string,
	expectedCount?: number,
): Promise<string[]> {
	const rowLocator = page.locator(
		`.${tableTestId}-body [data-testid="compactRow"]`,
	);
	if (expectedCount !== undefined) {
		await expect(rowLocator).toHaveCount(expectedCount, { timeout: 10000 });
	}
	return await page.evaluate((id) => {
		const body = document.querySelector(`.${id}-body`);
		if (!body) return [];
		const rows = body.querySelectorAll('[data-testid="compactRow"]');
		return Array.from(rows).map((row) => {
			const lines = row.querySelectorAll('[data-testid="compactLine"]');
			return Array.from(lines)
				.map((line) => {
					const cells = Array.from(line.children);
					return cells
						.map((cell) => {
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
						})
						.filter((s): s is string => s !== null)
						.join(" | ");
				})
				.join("\n");
		});
	}, tableTestId);
}
