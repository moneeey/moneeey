const Messages = {
  landing: {
    failed: 'Login failed, please try again',
    welcome: 'Please check your email.'
  },
  login: {
    completed: 'Welcome, please wait...',
    auth_code: 'Bad authentication code, please try again',
    confirm_code: 'Bad confirm code, please try again',
    code_expired: 'Confirm code expired, please try again'
  },
  import: {
    processing: 'Importing...',
    drop_here: 'Drop the files here ...',
    click_or_drop_here: 'Drag and drop files here, or click to select files',
    supported_formats: 'Supported: TXT, CSV',
    unknown_mode: (mode: string) => `Unknown mode ${mode}`,
    new_import: 'New import',
    configuration: 'Configuration',
    select_reference_account: 'Please select reference account',
  },
  util: {
    date_format: 'Date format:',
    reference_account: 'Reference account:',
    decimal_separator: 'Decimal separator:',
  },
  settings: {
    backup_loading: (percentage: number) => `Loading your backup data, please wait... ${percentage}%`,
    restore_loading: (percentage: number) => `Restoring your backup data, please wait... ${percentage}%`,
    restore_data_placeholder: 'Paste your restore data here and click "Restore data" again',
    clear_data_token: 'DELETE EVERYTHING',
    clear_data_placeholder: 'Type "DELETE EVERYTHING" in this text area and hit "Clear data" again to delete everything and start from zero.',
  }
}
export default Messages
