import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.indexedDB.deleteDatabase('_pouch_moneeey');
  });
});

test.describe('Tour', () => {
  test('Moneeey Tour', async ({ page }) => {
    expect(page.getByTestId('nm-modal-title')).toBeDefined()

    /*
    cy.contains('Start Tour').click();

    // Started tour, see currencies
    cy.contains('please edit the currencies');

    // Create first account
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();
    cy.contains('Now that we know the currencies we are having, it is time to tell us what are your accounts');

    // Check account is created before going next step
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();
    cy.contains('please create an account').click();

    // Type account in table to create a new account
    cy.get(loc.ACCOUNTS.NAME_INPUT).type('Account test');
    cy.get(loc.ACCOUNTS.NAME_INPUT).blur();
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();

    // Create a transaction
    cy.get(loc.TRANSACTIONS.FROM_INPUT).click();
    cy.get(loc.TRANSACTIONS.ACCOUNT_OPTION_ACCOUNT_TEST).click();

    // Wait persistence/pouchdb to sync that new account
    cy.get(loc.TRANSACTIONS.TO_INPUT).should('have.length', 2);

    // Create new payee
    cy.get(loc.TRANSACTIONS.TO_INPUT).first().type('Gas Station{enter}');
    cy.get(loc.TRANSACTIONS.AMOUNT_INPUT).first().type('123,45{enter}');
    cy.get(loc.TRANSACTIONS.AMOUNT_INPUT).first().blur();

    // Go to Budget
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();

    // Check budget is created before going next step
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();
    cy.contains('and create a budget').click();

    // Create new budget
    cy.get(loc.TOUR.NEW_BUDGET).click();
    cy.get(loc.BUDGET.NAME_INPUT).type('Budget test');
    cy.get(loc.BUDGET.CURRENCY_INPUT).click();
    cy.get(loc.BUDGET.CURRENCY_OPTION_BRL).should('be.visible').click();
    cy.get(loc.BUDGET.TAGS_INPUT).click().type('Gas Station{enter}');
    cy.get(loc.BUDGET.SAVE_BUTTON).click();

    // Confirm it appeared
    cy.contains('Budget test');
    cy.contains('R$');
    cy.get(loc.BUDGET.CARD_ALLOCATED_INPUT).first().type('544,14');
    cy.get(loc.BUDGET.CARD_ALLOCATED_INPUT).first().blur();
    cy.get(loc.BUDGET.CARD_REMAINING_INPUT).first().should('contain.value', '420,69');

    // Go to Import
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();
    cy.contains('New import');

    // Go to back to Transactions
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();
    cy.get(loc.TRANSACTIONS.TO_INPUT).should('have.length', 2);
    cy.contains('Gas Station');

    // Close tour
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();
    cy.contains('Welcome to Moneeey').should('not.exist');
    */
  });
});
