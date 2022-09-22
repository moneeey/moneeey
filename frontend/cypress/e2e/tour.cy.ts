/// <reference types="cypress" />

import loc from '../support/locators'

describe('Tour spec', () => {
  before(() => cy.visit('http://localhost:4270'))

  it('Start tour', () => {
    cy.contains('Welcome to Moneeey')
    cy.contains('Start Tour').click()
    cy.contains('The first step to archive your financial freedom is to let us know what currencies are you working with.')
    cy.wait(100)
    cy.get(loc.TOUR.BTN_NEXT).click()
    cy.contains(`Now that we know the currencies we are having, it's time to tell us what are your accounts`)
  })
})
