import { type Page, expect } from "@playwright/test";
import { Input } from "./page-objects";
import { TIMEOUTS } from "./perf";
import { classForTestIdTDs } from "./table";

/** Fluent wrapper around a budget table row (allocate + used/remaining asserts). */
export function BudgetRow(page: Page, index: number) {
	return {
		async allocate(value: string, expectedValue = value) {
			await Input(page, "editorAllocated", undefined, index).change(
				value,
				expectedValue,
			);
		},
		async expectAllocated(value: string) {
			await expect(page.getByTestId("editorAllocated").nth(index)).toHaveValue(
				value,
				{ timeout: TIMEOUTS.compute },
			);
		},
		async expectUsed(value: string) {
			await expect(page.getByTestId("editorUsed").nth(index)).toHaveValue(
				value,
				{ timeout: TIMEOUTS.compute },
			);
		},
		async expectRemaining(value: string, className?: string) {
			await expect(page.getByTestId("editorRemaining").nth(index)).toHaveValue(
				value,
				{ timeout: TIMEOUTS.compute },
			);
			if (className !== undefined) {
				const cls = classForTestIdTDs(page, "editorRemaining");
				expect(await cls(index)).toEqual(className);
			}
		},
	};
}
