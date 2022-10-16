// eslint-disable-next-line spaced-comment
/// <reference types="cypress" />

import loc from '../support/locators';
import '../support/cypress-indexeddb-namespace';

describe('Tour spec', () => {
  before(() => {
    cy.clearIndexedDb('_pouch_moneeey');
    cy.visit('/');
  });

  it('Start tour', () => {
    // Landing modal
    cy.contains('Welcome to Moneeey');
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
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();

    // Create a transaction
    cy.get(loc.TRANSACTIONS.FROM_INPUT).click();
    cy.get(loc.TRANSACTIONS.ACCOUNT_OPTION_ACCOUNT_TEST).click();

    // Wait persistence/pouchdb to sync that new account
    cy.get(loc.TRANSACTIONS.TO_INPUT).should('have.length', 2);
    cy.get(loc.TRANSACTIONS.TO_INPUT).first().click().type('Gas Station{enter}');

    // Go to Import
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();
    cy.contains('New import');

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
    cy.get(loc.BUDGET.TAGS_INPUT).type('Hello');
    cy.get(loc.BUDGET.SAVE_BUTTON).click();

    // Confirm it appeared
    cy.contains('Budget test');
    cy.contains('R$');

    // Go to back to Transactions
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();
    cy.get(loc.TRANSACTIONS.TO_INPUT).should('have.length', 2);
    cy.contains('Gas Station');

    // Close tour
    cy.get(loc.TOUR.NEXT_BUTTON).should('be.visible').click();
    cy.contains('Welcome to Moneeey').should('not.exist');
  });
});
