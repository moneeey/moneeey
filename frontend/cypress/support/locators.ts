const locators = {
  TOUR: {
    NEXT_BUTTON: '[data-test-id="ok-button"]',
    NEW_BUDGET: '[data-test-id="link-button"]:first',
  },
  ACCOUNTS: {
    NAME_INPUT: '[data-test-id^="editorName"]',
  },
  BUDGET: {
    CURRENCY_INPUT: '[class*="budgetCurrency"]',
    NAME_INPUT: '[data-test-id="budgetName"]',
    TAGS_INPUT: '[class*="budgetTags"]',
    CURRENCY_OPTION_BRL: '.mn-select__option:contains("Real brasileiro")',
    SAVE_BUTTON: '[data-test-id="budgetSave"]',
    CARD_ALLOCATED_INPUT: '[data-test-id^="editorAllocated"]',
    CARD_REMAINING_INPUT: '[data-test-id^="editorRemaining"]',
  },
  TRANSACTIONS: {
    FROM_INPUT: '[class*="editorFrom"]',
    TO_INPUT: '[class*="editorTo"]',
    AMOUNT_INPUT: '[data-test-id^="editorAmount"]',
    ACCOUNT_OPTION_ACCOUNT_TEST: '.mn-select__option:contains("Account test")',
  },
};

export default locators;
