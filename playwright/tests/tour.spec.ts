import { Page, expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.indexedDB.deleteDatabase('_pouch_moneeey');
  });
});

// TODO: SelectFixture (selectOption, createOption)
// TODO: TourFixture (next)
// TODO: BudgetEditorFixture (setName, setCurrency, setTags, create)
// TODO: NotificationFixture (byText, dismiss)
// TODO: Avoid assertion page.getByText(...), preferr page.getByRole().toContainText()

async function dismissStatus(page: Page, text: string) {
  await expect(page.getByText(text)).toContainText(text)
  const dismissIcon = () => page.getByTestId('mn-dismiss-status')
  expect(dismissIcon()).toBeVisible()
  await dismissIcon().click()
  expect(dismissIcon()).not.toBeVisible()
}

function tourNext(page: Page) {
  return page.getByTestId('nm-modal-card').getByTestId('next').click() // Start Tour
}

test.describe('Tour', () => {
  test('Moneeey Tour', async ({ page }) => {
    await expect(page.getByTestId('nm-modal-title')).toContainText('Introducing Moneeey')
    await page.getByTestId('start-tour').click() // Start Tour

    expect(page.getByText('please edit the currencies')).toBeDefined()
    await tourNext(page) // Next after Edit Currencies

    // Accounts page
    expect(page.getByText('Now that we know the currencies')).toBeDefined()

    // Dismiss error continuing without creating an account
    await tourNext(page) // Next on Edit accounts
    expect(page.getByText('Now that we know the currencies')).toBeDefined() // Fails because must create account before proceeding

    await dismissStatus(page, 'Before continuing, please create an account by typing its information in the table below.')

    // Type account in table to create a new account
    await page.getByTestId('editorName').fill('Account test')
    await page.getByTestId('editorName').blur()

    // Progress Tour to Transactions
    await tourNext(page)
    expect(page.getByText('start inserting transactions')).toBeDefined()

    // Create new transaction with previous account
    await page.locator('.editorFrom').click()
    await page.getByText('Account test', { exact: true }).click()

    // Create new payee
    await page.locator('.editorTo').click()
    await page.locator('.editorTo .mn-select__input').fill('Gas Station')
    await page.locator('.editorTo .mn-select__input').press('Enter')

    // Fill the amount
    await expect(page.getByTestId('editorAmount')).toHaveCount(2)
    await page.getByTestId('editorAmount').first().click()
    await page.getByTestId('editorAmount').first().fill('123,45')
    await page.getByTestId('editorAmount').first().blur()

    // Progress Tour to Transactions
    await tourNext(page)
    expect(page.getByText('time to budget')).toBeDefined()

    // Cant progress because must create budget
    await tourNext(page)
    await dismissStatus(page, 'Before continuing, please click on \'New Budget\' and create a budget')

    // New budget
    await page.getByTestId('link-button').first().click()

    // Create budget
    const budgetEditor = page.getByTestId('budgetEditorDrawer')
    await budgetEditor.getByTestId('budgetName').fill('Budget test')
    await budgetEditor.getByTestId('budgetName').blur()
    await budgetEditor.locator('.budgetCurrency').click()
    await page.getByText('Real brasileiro', { exact: true }).click()
    await budgetEditor.locator('.budgetTags').click()
    await budgetEditor.locator('.budgetTags .mn-select__input').fill('Station')
    await budgetEditor.locator('.budgetTags .mn-select__input').press('Enter')
    await budgetEditor.getByTestId('budgetSave').click()

    // Allocate on budget and wait for calculated used/remaining
    expect(page.getByText('R$').first()).toBeDefined()
    await page.getByTestId('editorAllocated').first().click()
    await page.getByTestId('editorAllocated').first().fill('544,14')
    await page.getByTestId('editorAllocated').first().blur()
    await expect(page.getByTestId('editorUsed').first()).toHaveValue('123,45')
    await expect(page.getByTestId('editorRemaining').first()).toHaveValue('420,69')

    // Go to Import
    await tourNext(page)
    expect(page.getByText('New import')).toBeDefined()

    // Finish on Transactions
    await tourNext(page)
    expect(page.getByText('Gas Station')).toBeDefined()

    // Close Tour
    await tourNext(page)

    // Tour is closed
    expect(page.getByTestId('nm-modal-title')).toBeHidden()
  });
});
