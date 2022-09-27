// eslint-disable-next-line spaced-comment
/// <reference types="cypress" />

import loc from '../support/locators'
import '../support/cypress-indexeddb-namespace'

describe('Tour spec', () => {
  before(() => {
    cy.clearIndexedDb('_pouch_moneeey')
    cy.visit('http://localhost:4270')
  })

  it('Start tour', () => {
    cy.contains('Welcome to Moneeey')
    cy.contains('Start Tour').click()
    cy.contains(
      'The first step to archive your financial freedom is to let us know what currencies are you working with'
    )
    cy.wait(100)
    cy.get(loc.TOUR.NEXT_BUTTON).click()
    cy.contains('Now that we know the currencies we are having, it is time to tell us what are your accounts')
    cy.get(loc.ACCOUNTS.NAME_INPUT).type('Account test')
    cy.wait(100)
    cy.get(loc.TOUR.NEXT_BUTTON).click()
    cy.contains('New budget').click()
    cy.get(loc.BUDGET.NAME_INPUT).type('Budget test')
  })
})
