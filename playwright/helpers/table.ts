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
