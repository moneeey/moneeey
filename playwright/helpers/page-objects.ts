import { type Locator, type Page, expect } from "@playwright/test";

/**
 * Wraps a React-Select dropdown by testId. Supports choose, create, and chooseOrCreate.
 */
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
			await open();
			const option = () => findMenuItem(optionName, false);
			if ((await option().count()) > 0) {
				await this.choose(optionName, false);
			} else {
				await createNew(optionName);
			}
			await waitForClosed();
			await expect(select()).toContainText(optionName, { timeout: 10000 });
		},
	};
}

/**
 * Wraps a text input by testId with change/read/assert helpers.
 */
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
			await input.click();
			await input.fill(value);
			await input.blur();
			await expect(input).toHaveValue(expectedValue, { timeout: 5000 });
		},
	};
}

/**
 * Expands the sidebar menu (if collapsed) and clicks a menu item by visible text.
 * For ambiguous labels (e.g. "Accounts"), use clickMenuByTestId instead.
 */
export async function OpenMenuItem(page: Page, title: string) {
	const toggle = page.getByTestId("toggleMenu");
	if ((await toggle.getAttribute("data-expanded")) === "false") {
		await toggle.click();
	}
	return await page.getByText(title).click();
}

/**
 * Navigates via sidebar menu item by its testId (avoids ambiguous text matching).
 * Use this for items like "Accounts" that may appear as labels on other pages.
 */
export async function clickMenuByTestId(page: Page, testId: string) {
	const toggle = page.getByTestId("toggleMenu");
	if ((await toggle.getAttribute("data-expanded")) === "false") {
		await toggle.click();
	}
	await page.getByTestId(testId).click();
}

/**
 * Asserts and dismisses a warning notification containing the given text.
 */
export async function dismissNotification(page: Page, text: string) {
	await expect(page.getByTestId("mn-status-warning")).toContainText(text);
	const dismissIcon = () => page.getByTestId("mn-dismiss-status");
	await expect(dismissIcon()).toBeVisible();
	await dismissIcon().click();
	await expect(dismissIcon()).not.toBeVisible();
}

/**
 * Waits for the loading progress indicator to disappear.
 */
export async function waitLoading(page: Page) {
	return await page.waitForFunction(
		(selector) => !document.querySelector(selector),
		"[data-testid=loadingProgress]",
	);
}

/**
 * Closes the tour modal if it's open (used after completeLandingWizard).
 */
export async function closeTourModal(page: Page) {
	await page.getByTestId("nm-modal-card").getByTestId("close").click();
}
