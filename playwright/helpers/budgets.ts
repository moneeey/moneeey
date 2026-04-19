import { type Page, expect } from "@playwright/test";
import { formatDateMonth } from "../../frontend/src/utils/Date";
import { Input } from "./page-objects";
import { TIMEOUTS } from "./perf";
import { classForTestIdTDs } from "./table";

/** Fluent wrapper around a budget table row (allocate + used/remaining asserts). */
export function BudgetRow(page: Page, index: number, date: Date = new Date()) {
	const card = page.getByTestId(`budget_period_${formatDateMonth(date)}`);
	return {
		async allocate(value: string, expectedValue = value) {
			await Input(
				card,
				"editorAllocated",
				undefined,
				index,
			).change(value, expectedValue);
		},
		async expectAllocated(value: string) {
			await expect(card.getByTestId("editorAllocated").nth(index)).toHaveValue(
				value,
				{ timeout: TIMEOUTS.compute },
			);
		},
		async expectUsed(value: string) {
			await expect(card.getByTestId("editorUsed").nth(index)).toHaveValue(
				value,
				{ timeout: TIMEOUTS.compute },
			);
		},
		async expectRemaining(value: string, className?: string) {
			await expect(
				card.getByTestId("editorRemaining").nth(index),
			).toHaveValue(value, { timeout: TIMEOUTS.compute });
			if (className !== undefined) {
				const cls = classForTestIdTDs(card, "editorRemaining");
				expect(await cls(index)).toEqual(className);
			}
		},
	};
}
