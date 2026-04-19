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

async function getCellDataString(page: Page, column: string, index: number) {
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
}

/**
 * Serializes a single table row's data into a compact string for equality checks.
 * Each column is read as either an input value or a select value depending on
 * its testId, and its normalized CSS class is appended.
 *
 * `columns` may be a flat list (one line, joined with " | ") or a 2D array of
 * lines (matching a CompactLayout) — in the 2D case, each line is joined with
 * " | " and lines are joined with "\n".
 */
export async function retrieveRowData(
	page: Page,
	columns: string[] | string[][],
	index: number,
) {
	const lines: string[][] = Array.isArray(columns[0])
		? (columns as string[][])
		: [columns as string[]];

	const renderedLines = await Promise.all(
		lines.map(async (line) => {
			const cells = await Promise.all(
				line.map((column) => getCellDataString(page, column, index)),
			);
			return cells.join(" | ");
		}),
	);

	return renderedLines.join("\n");
}

/**
 * Snapshots all rows of a table as an array of strings, one per row.
 * If expectedCount is provided, waits for that many rows before reading.
 *
 * Pass a 2D `columns` array to mirror a multi-line compact layout — the
 * resulting per-row snapshot uses "\n" between lines.
 */
export async function retrieveRowsData(
	page: Page,
	columns: string[] | string[][],
	expectedCount?: number,
) {
	const firstColumn = (
		Array.isArray(columns[0]) ? (columns as string[][])[0][0] : columns[0]
	) as string;
	if (expectedCount) {
		await expect(page.getByTestId(firstColumn)).toHaveCount(expectedCount, {
			timeout: 10000,
		});
	}
	const rows = await page.getByTestId(firstColumn).all();
	return await Promise.all(
		Array.from({ length: rows.length }).map((_v, index) =>
			retrieveRowData(page, columns, index),
		),
	);
}
