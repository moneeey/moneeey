import { type Locator, type Page, expect } from "@playwright/test";
import { TIMEOUTS } from "./perf";

/** Wraps a React-Select dropdown by testId. */
export function Select(page: Page, testId: string, index = 0) {
	const select = () => page.getByTestId(testId).nth(index);
	const input = () => select().locator(".mn-select__input");
	const menuList = () => page.locator(".mn-select__menu-list");

	const waitForClosed = async () =>
		await expect(menuList()).toBeHidden({ timeout: 5000 });
	const open = async () => {
		if (await menuList().isHidden()) {
			await select().click();
		}
	};

	const listOptions = async () =>
		await menuList().locator(".mn-select__option").allTextContents();
	const findMenuItem = (optionName: string, exact = true) =>
		menuList().getByText(optionName, { exact });
	const createNew = async (optionName: string) => {
		await input().fill(optionName);
		await input().press("Enter");
		await waitForClosed();
	};
	const currentValue = async () =>
		select()
			.locator(".mn-select__single-value, .mn-select__placeholder")
			.innerText();

	return {
		async value() {
			return await currentValue();
		},
		async options() {
			await open();
			return listOptions();
		},
		async create(optionName: string) {
			await open();
			await createNew(optionName);
			await waitForClosed();
			await expect(select()).toContainText(optionName, { timeout: 10000 });
		},
		async choose(optionName: string, exact = true, retries = 3) {
			try {
				await open();
				const option = findMenuItem(optionName, exact);
				await option.click({ timeout: 5000 });
				await waitForClosed();
			} catch (e) {
				if (
					(e.message.includes("detached") || e.message.includes("Timeout")) &&
					retries > 0
				) {
					console.warn(`Option issue, retrying choose... ${retries}`);
					await this.choose(optionName, exact, retries - 1);
				} else {
					throw e;
				}
			}
		},
		async chooseOrCreate(optionName: string) {
			// Retry the whole pick-or-create loop — the react-select's display
			// value can lag behind the MobX store during persistence re-renders.
			await expect(async () => {
				await open();
				const option = () => findMenuItem(optionName, false);
				if ((await option().count()) > 0) {
					await this.choose(optionName, false);
				} else {
					await createNew(optionName);
				}
				await waitForClosed();
				await expect(select()).toContainText(optionName, { timeout: 5000 });
			}).toPass({ timeout: 20_000, intervals: [500, 1000, 2000] });
		},
	};
}

/** Wraps a text input by testId with change/read/assert helpers. */
export function Input(
	page: Page,
	testId: string,
	container?: Locator,
	index = 0,
) {
	const input = (container || page).getByTestId(testId).nth(index);

	return {
		async value() {
			return input.getAttribute("value");
		},
		async toHaveValue(value: string, timeout = 10000) {
			await expect(input).toHaveValue(value, { timeout });
		},
		async change(value: string, expectedValue = value) {
			// Retry the click/fill/blur cycle — controlled InputNumber components
			// occasionally reset to 0 if the blur handler races with React state.
			await expect(async () => {
				await input.click();
				await input.fill(value);
				await input.blur();
				await expect(input).toHaveValue(expectedValue, { timeout: 2000 });
			}).toPass({ timeout: 15_000, intervals: [200, 500, 1000] });
		},
	};
}

/**
 * Expands the sidebar (if collapsed) and clicks a menu item by visible text.
 *
 * Scoped to the `appMenu` container so page-body text (headings,
 * breadcrumbs, in-table cells) can't accidentally match. The click is wrapped
 * in `toPass` because the AppMenu is keyed on the set of transactions and
 * running balances and fully remounts whenever either changes — on Firefox
 * CI that remount can race a click and leave Playwright hanging on a stale
 * element reference.
 */
export async function OpenMenuItem(page: Page, title: string) {
	const toggle = page.getByTestId("toggleMenu");
	if ((await toggle.getAttribute("data-expanded")) === "false") {
		await toggle.click();
	}
	const sidebar = page.getByTestId("appMenu");
	// Not using `{ exact: true }` because account menu items render their
	// label, currency and running balance as separate nodes — an exact
	// match on inner text would include the running balance suffix.
	await expect(async () => {
		await sidebar.getByText(title).first().click({ timeout: 3000 });
	}).toPass({ timeout: 15_000, intervals: [250, 500, 1000] });
}

/** Like OpenMenuItem but uses a testId — avoids ambiguous text matches. */
export async function clickMenuByTestId(page: Page, testId: string) {
	const toggle = page.getByTestId("toggleMenu");
	if ((await toggle.getAttribute("data-expanded")) === "false") {
		await toggle.click();
	}
	await page.getByTestId(testId).click();
}

/** Asserts a warning notification contains `text` and dismisses it. */
export async function dismissNotification(page: Page, text: string) {
	await expect(page.getByTestId("mn-status-warning")).toContainText(text);
	const dismissIcon = () => page.getByTestId("mn-dismiss-status");
	await expect(dismissIcon()).toBeVisible();
	await dismissIcon().click();
	await expect(dismissIcon()).not.toBeVisible();
}

/** Waits for the loading progress indicator to disappear. */
export async function waitLoading(page: Page) {
	await page
		.getByTestId("loadingProgress")
		.waitFor({ state: "hidden", timeout: TIMEOUTS.query });
}

export async function closeTourModal(page: Page) {
	await page.getByTestId("nm-modal-card").getByTestId("close").click();
}
