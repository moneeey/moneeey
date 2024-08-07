const Messages = {
	menu: {
		title: "Moneeey",
		search: "Search",
		dashboard: "Dashboard",
		transactions: "Transactions",
		unassigned: (amount: number) => `Unassigned (${amount})`,
		balance: (amount: string) => `Balance: ${amount}`,
		all_transactions: "All transactions",
		import: "Import",
		budget: "Budget",
		reports: "Reports",
		settings: "Settings",
		currencies: "Currencies",
		payees: "Payees",
		accounts: "Accounts",
		preferences: "Preferences",
		start_tour: "Start tour",
		sync: {
			ONLINE: "Online",
			OFFLINE: "Offline",
			DENIED: "Denied",
			ERROR: "Error",
		} as Record<string, string>,
	},
	landing: {
		failed: "Login failed, please try again",
		welcome: "Please check your email.",
		title: "Introducing Moneeey",
		messages: [
			"Budget with ease using Moneeey's intuitive interface",
			"Achieve financial independence and live life to the fullest",
			"Take ownership of your sensitive information",
			"Built with privacy and security in mind",
			"Enjoy end-to-end encryption for maximum data protection",
			"Seamlessly import and export your financial data",
		],
	},
	login: {
		completed: "Welcome, please wait...",
		auth_code: "Bad authentication code, please try again",
		confirm_code: "Bad confirm code, please try again",
		code_expired: "Confirm code expired, please try again",
		login_or_signup: "Login or Sign up",
		email: "Email",
		logout: "Logout",
	},
	import: {
		start: "New import",
		processing: "Importing...",
		success: (fileName: string) => `We found these transactions in "${fileName}". Please, confirm the transaction
      from/to accounts, updating errors, that way Moneeey will learn from your changes and be smarter in the next
      import.`,
		drop_here: "Drop the files here ...",
		click_or_drop_here: "Drag and drop files here, or click to select files",
		supported_formats: "Supported: TXT, CSV, OFX, PDF",
		unknown_mode: (mode: string) => `Unknown mode ${mode}`,
		new_import: "New import",
		configuration: "Configuration",
		select_reference_account: "Please select reference account",
		updated: "Updated",
		existing: "Existing",
		new: "New",
		unchanged: "Unchanged",
		import_transactions: "Import transactions",
		invert_from_to_accounts: "Invert from and to accounts",
		changed_description: (from_value: string, to_value: string) =>
			`Changed from\n${from_value}\nto\n${to_value}`,
	},
	util: {
		name: "Name",
		tags: "Tags",
		archived: "Archived",
		close: "Close",
		created: "Created",
		delete: "Delete",
		currency: "Currency",
		date: "Date",
		date_format: "Date format",
		loading: "Loading...",
		day: "Day",
		week: "Week",
		month: "Month",
		quarter: "Quarter",
		year: "Year",
		ok: "Ok",
		cancel: "Cancel",
		clear: "Clear",
		required: "Required",
	},
	settings: {
		reload_page: "Reload your page",
		export_data: "Export data",
		import_data: "Import data",
		clear_all: "Clear all data",
		default_currency: "Default currency",
		reference_account: "Reference account",
		decimal_separator: "Decimal separator",
		thousand_separator: "Thousand separator",
		backup_loading: (percentage: number) =>
			`Loading your backup data, please wait... ${percentage}%`,
		restore_loading: (percentage: number) =>
			`Restoring your backup data, please wait... ${percentage}%`,
		restore_data_placeholder:
			'Paste your restore data here and click "Restore data" again',
		clear_data_token: "DELETE EVERYTHING",
		clear_data_placeholder:
			'Type "DELETE EVERYTHING" in this text area and hit "Clear data" again to delete everything and start from zero.',
		create_entity: (entity: string) => `Create ${entity}`,
		select_default_currency: "Select default currency",
		select_language: "Select language",
	},
	budget: {
		budget: "Budget",
		new: "New budget",
		next: "Next",
		prev: "Prev",
		save: "Save",
		show_months: "Visible months",
		show_archived: "Show archived budgets",
		allocated: "Allocated",
		used: "Used",
		remaining: "Remaining",
	},
	account: {
		add_account: "Create account",
		offbudget: "Off-Budget",
		account_kind: "Type",
		kind: {
			CHECKING: "Checking Account",
			CREDIT_CARD: "Credit Card",
			INVESTMENT: "Investment Account",
			PAYEE: "Payee",
			SAVINGS: "Savings Account",
		} as Record<string, string>,
	},
	new_account: {
		name: "New account name",
		type: "Kind",
		currency: "Currency",
		initial_balance: "Initial balance",
		submit_close: "Save and close",
		submit_another: "Save and add another",
	},
	currencies: {
		short: "Short name",
		prefix: "Prefix",
		suffix: "Suffix",
		decimals: "Decimals",
	},
	transactions: {
		amount: "Amount",
		memo: "Memo",
		from_account: "From",
		to_account: "To",
		running_balance: "Running",
	},
	dashboard: {
		recent_transactions: "Recent transactions",
	},
	reports: {
		account_balance: "Account balance",
		payee_balance: "Payee balance",
		tag_expenses: "Tag expenses",
		wealth_growth: "Wealth growth",
		income_vs_expenses: "Income vs Expenses",
		wealth: "Wealth",
		income: "Income",
		expense: "Expense",
		include_accounts: "Include accounts: ",
	},
	modal: {
		landing: "Welcome to Moneeey",
		start_tour: "Start Tour",
		sync: "Sync",
		merge_accounts: "Merge accounts",
	},
	merge_accounts: {
		submit: "Merge accounts",
		description:
			"Merge two accounts into a single, moving all transactions with source account into the target account.",
		source: "Source account (deleted)",
		target: "Target account (merged into)",
		success: "Accounts merged successfully",
	},
	sync: {
		intro: `
      Synchronizing your data allows you to use Moneeey from multiple devices in real time,
      allowing even real time collaboration with related people.
    `,
		login: {
			success: "Successful logged in!",
			started:
				"A login email confirmation was sent to you, please confirm by clicking on its link.",
			error: "Unable to send login email confirmation.",
		},
		couchdb: {
			url: "CouchDB URL",
			username: "CouchDB Username",
			password: "CouchDB Password",
		},
		start: "Start synchronization",
		stop: "Stop synchronization",
		moneeey_account: "Moneeey account",
		database: "Database",
		select_db: "Select",
	},
	tour: {
		welcome: "Welcome to Moneeey",
		next: "Next",
		prev: "Previous",

		continue_language: "Continue to default currency selection",
		continue_currency: "Continue to Moneeey",

		currencies: `Moneeey is multi currency!
      We have added the 50 most used currencies in the world
      Feel free to add or customize as you like!

    Click 'Next' to proceed.`,
		accounts: `You can manage your Accounts on this area.
      Here, we can add new accounts, change currencies,
      set them to be off-budget and archive accounts.

    Click 'Next' to proceed.`,
		transactions: `Moneeey will generate reports and
      calculate your data based on the Transaction rows.

      When looking a specific Account transactions,
      a Running column will appear with the running
      balance.

      On the transactions table, we can easily add new payees
      by starting typing a new payee name and hitting
      the "Create 'typed name'" option.

    Click 'Next' to proceed.`,
		budgets: `It is time to budget your Moneeey!  Budgets are like envelopes you put part of your income.

      You should create budgets for things like:
        home/mortgage, car maintenance, utilities, entertainment...

      These budgets will be calculated in real time and allow you keep track and boundaries on your moneeey!

      Click on 'New budget' button and create a new budget`,

		please_create_account: `Before continuing, please create an account by typing its information in the table below.
    `,

		please_create_budget: `Before continuing, please click on 'New Budget' and create a budget.
    `,

		import: `Inserting transactions manually can be quite boring...  So we allow you to import from common bank formats!

      When importing a transaction, we will try our best to guess which payees those transactions are related to.

      The more transactions Moneeey have, the smarter it becomes!`,
		your_turn: `Now it is your turn!

      Time to insert some transactions!`,
	},
};

export default Messages;
