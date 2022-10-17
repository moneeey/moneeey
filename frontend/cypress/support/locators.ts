const locators = {
  TOUR: {
    NEXT_BUTTON: '[data-test-id="ok-button"]',
    NEW_BUDGET: '[data-test-id="link-button"]:first',
  },
  ACCOUNTS: {
    NAME_INPUT: '[data-test-id^="editorName"]',
  },
  BUDGET: {
    CURRENCY_INPUT: '[data-test-id="budgetCurrency"]',
    NAME_INPUT: '[data-test-id="budgetName"]',
    TAGS_INPUT: '[data-test-id="budgetTags"]',
    CURRENCY_OPTION_BRL: '[title="Real brasileiro"]',
    SAVE_BUTTON: '[data-test-id="budgetSave"]',
    CARD_ALLOCATED_INPUT: '[data-test-id^="editorAllocated"]',
    CARD_REMAINING_INPUT: '[data-test-id^="editorRemaining"]',
  },
  TRANSACTIONS: {
    FROM_INPUT: '[data-test-id^="editorFrom_"]',
    TO_INPUT: '[data-test-id^="editorTo_"]',
    AMOUNT_INPUT: '[data-test-id^="editorAmount"]',
    ACCOUNT_OPTION_ACCOUNT_TEST: '[title="Account test"]',
  },
};

export default locators;
