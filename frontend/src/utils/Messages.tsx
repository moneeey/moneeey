import { Status } from '../shared/Persistence'

const Messages = {
  menu: {
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    unassigned: 'Unassigned',
    import: 'Import',
    budget: 'Budget',
    reports: 'Reports',
    settings: 'Settings',
    currencies: 'Currencies',
    payees: 'Payees',
    accounts: 'Accounts',
    preferences: 'Preferences',
    sync: {
      [Status.ONLINE]: 'Online',
      [Status.OFFLINE]: 'Offline',
    },
  },
  landing: {
    failed: 'Login failed, please try again',
    welcome: 'Please check your email.',
  },
  login: {
    completed: 'Welcome, please wait...',
    auth_code: 'Bad authentication code, please try again',
    confirm_code: 'Bad confirm code, please try again',
    code_expired: 'Confirm code expired, please try again',
  },
  import: {
    start: 'New import',
    processing: 'Importing...',
    drop_here: 'Drop the files here ...',
    click_or_drop_here: 'Drag and drop files here, or click to select files',
    supported_formats: 'Supported: TXT, CSV, OFX',
    unknown_mode: (mode: string) => `Unknown mode ${mode}`,
    new_import: 'New import',
    configuration: 'Configuration',
    select_reference_account: 'Please select reference account',
    updated: 'Updated',
    unchanged: 'Unchanged',
    import_transactions: 'Import transactions',
    changed_description: (from_value: string, to_value: string) =>
      `Changed from\n${from_value}\nto\n${to_value}`,
  },
  util: {
    name: 'Name',
    tags: 'Tags',
    archived: 'Archived',
    close: 'Close',
    created: 'Created',
    currency: 'Currency',
    date: 'Date',
    date_format: 'Date format',
    loading: 'Loading...',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    quarter: 'Quarter',
    year: 'Year',
  },
  settings: {
    reload_page: 'Reload your page',
    export_data: 'Export data',
    import_data: 'Import data',
    clear_all: 'Clear all data',
    default_currency: 'Default currency',
    reference_account: 'Reference account',
    decimal_separator: 'Decimal separator',
    backup_loading: (percentage: number) =>
      `Loading your backup data, please wait... ${percentage}%`,
    restore_loading: (percentage: number) =>
      `Restoring your backup data, please wait... ${percentage}%`,
    restore_data_placeholder:
      'Paste your restore data here and click "Restore data" again',
    clear_data_token: 'DELETE EVERYTHING',
    clear_data_placeholder:
      'Type "DELETE EVERYTHING" in this text area and hit "Clear data" again to delete everything and start from zero.',
    create_entity: (entity: string) => `Create ${entity}`,
  },
  budget: {
    new: 'New budget',
    next: 'Next',
    prev: 'Prev',
    save: 'Save',
    show_months: 'Visible months',
    show_archived: 'Show archived budgets',
  },
  account: {
    offbudget: 'Off-Budget',
  },
  currencies: {
    short: 'Short name',
    prefix: 'Prefix',
    suffix: 'Suffix',
    decimals: 'Decimals',
  },
  transactions: {
    amount: 'Amount',
    memo: 'Memo',
    from_account: 'From',
    to_account: 'To',
  },
  dashboard: {
    recent_transactions: 'Recent transactions',
  },
  reports: {
    account_balance: 'Account balance',
    payee_balance: 'Payee balance',
    tag_expenses: 'Tag expenses',
    wealth_growth: 'Wealth growth',
    income_vs_expenses: 'Income vs Expenses',
    wealth: 'Wealth',
    income: 'Income',
    expense: 'Expense',
  },
}
export default Messages
