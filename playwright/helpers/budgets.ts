import { type Page, expect } from "@playwright/test";
import { Input } from "./page-objects";
import { TIMEOUTS } from "./perf";
import { classForTestIdTDs } from "./table";

/**
 * Fluent wrapper around a single row in the budget table. Collapses the
 * repeated `allocate → assert used → assert remaining` triplet (with its
 * magic-number 15000ms timeout) that showed up in budgets.spec.ts,
 * tour.spec.ts and multi-currency.spec.ts.
 *
 * Usage:
 *   const food = BudgetRow(page, 0);
 *   await food.allocate("30");
 *   await food.expectUsed("50");
 *   await food.expectRemaining("-20", "bg---800 opacity-80 text-red-200");
 */
export function BudgetRow(page: Page, index: number) {
	return {
		async allocate(value: string, expectedValue = value) {
			await Input(page, "editorAllocated", undefined, index).change(
				value,
				expectedValue,
			);
		},
		async expectAllocated(value: string) {
			await expect(
				page.getByTestId("editorAllocated").nth(index),
			).toHaveValue(value, { timeout: TIMEOUTS.compute });
		},
		async expectUsed(value: string) {
			await expect(page.getByTestId("editorUsed").nth(index)).toHaveValue(
				value,
				{ timeout: TIMEOUTS.compute },
			);
		},
		async expectRemaining(value: string, className?: string) {
			await expect(
				page.getByTestId("editorRemaining").nth(index),
			).toHaveValue(value, { timeout: TIMEOUTS.compute });
			if (className !== undefined) {
				const cls = classForTestIdTDs(page, "editorRemaining");
				expect(await cls(index)).toEqual(className);
			}
		},
	};
}
