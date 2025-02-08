const Language = {
	menu: {
		title: { en: "Moneeey", pt: "Moneeey", es: "Moneeey" },
		search: { en: "Search", pt: "Pesquisar", es: "Buscar" },
		dashboard: { en: "Dashboard", pt: "Sumário", es: "Panel de control" },
		transactions: { en: "Transactions", pt: "Transações", es: "Transacciones" },
		unassigned: {
			en: (amount: number) => `Unassigned (${amount})`,
			pt: (amount: number) => `Não atribuído (${amount})`,
			es: (amount: number) => `Sin asignar (${amount})`,
		},
		balance: {
			en: (amount: string) => `Balance: ${amount}`,
			pt: (amount: string) => `Saldo: ${amount}`,
			es: (amount: string) => `Saldo: ${amount}`,
		},
		all_transactions: {
			en: "All transactions",
			pt: "Todas as transações",
			es: "Todas las transacciones",
		},
		import: { en: "Import", pt: "Importar", es: "Importar" },
		budget: { en: "Budget", pt: "Orçamento", es: "Presupuesto" },
		reports: { en: "Reports", pt: "Relatórios", es: "Informes" },
		settings: { en: "Settings", pt: "Configurações", es: "Configuración" },
		currencies: { en: "Currencies", pt: "Moedas", es: "Monedas" },
		payees: { en: "Payees", pt: "Beneficiários", es: "Beneficiarios" },
		accounts: { en: "Accounts", pt: "Contas", es: "Cuentas" },
		preferences: { en: "Preferences", pt: "Preferências", es: "Preferencias" },
		start_tour: { en: "Start tour", pt: "Iniciar tour", es: "Comenzar tour" },
		sync_ONLINE: { en: "Online", pt: "Online", es: "En línea" },
		sync_OFFLINE: { en: "Offline", pt: "Offline", es: "Fuera de línea" },
		sync_DENIED: { en: "Denied", pt: "Negado", es: "Denegado" },
		sync_ERROR: { en: "Error", pt: "Erro", es: "Error" },
	},

	landing: {
		failed: {
			en: "Login failed, please try again",
			pt: "Login falhou, por favor tente novamente",
			es: "Inicio de sesión fallido, por favor intente de nuevo",
		},
		welcome: {
			en: "Please check your email.",
			pt: "Por favor, verifique seu e-mail.",
			es: "Por favor, revise su correo electrónico.",
		},
		title: {
			en: "Introducing Moneeey",
			pt: "Apresentando Moneeey",
			es: "Presentando Moneeey",
		},
		messages: {
			en: [
				"Budget with ease using Moneeey's intuitive interface",
				"Achieve financial independence and live life to the fullest",
				"Take ownership of your sensitive information",
				"Built with privacy and security in mind",
				"Enjoy end-to-end encryption for maximum data protection",
				"Seamlessly import and export your financial data",
			],
			pt: [
				"Orçamento com facilidade usando a interface intuitiva do Moneeey",
				"Alcance a independência financeira e viva a vida ao máximo",
				"Assuma o controle de suas informações sensíveis",
				"Construído com privacidade e segurança em mente",
				"Aproveite a criptografia de ponta a ponta para máxima proteção de dados",
				"Importe e exporte seus dados financeiros sem problemas",
			],
			es: [
				"Presupueste con facilidad utilizando la interfaz intuitiva de Moneeey",
				"Logre la independencia financiera y viva la vida al máximo",
				"Tome posesión de su información sensible",
				"Construido con la privacidad y seguridad en mente",
				"Disfrute de la encriptación de extremo a extremo para la máxima protección de datos",
				"Importe y exporte sus datos financieros sin problemas",
			],
		},
	},

	login: {
		completed: {
			en: "Welcome, please wait...",
			pt: "Bem-vindo, por favor aguarde...",
			es: "Bienvenido, por favor espere...",
		},
		auth_code: {
			en: "Bad authentication code, please try again",
			pt: "Código de autenticação incorreto, por favor tente novamente",
			es: "Código de autenticación incorrecto, por favor intente de nuevo",
		},
		confirm_code: {
			en: "Bad confirm code, please try again",
			pt: "Código de confirmação incorreto, por favor tente novamente",
			es: "Código de confirmación incorrecto, por favor intente de nuevo",
		},
		code_expired: {
			en: "Confirm code expired, please try again",
			pt: "Código de confirmação expirado, por favor tente novamente",
			es: "Código de confirmación caducado, por favor intente de nuevo",
		},
		login_or_signup: {
			en: "Login or Sign up",
			pt: "Entrar ou Inscrever-se",
			es: "Iniciar sesión o Registrarse",
		},
		email: {
			en: "Email",
			pt: "E-mail",
			es: "Correo electrónico",
		},
		logout: {
			en: "Logout",
			pt: "Sair",
			es: "Cerrar sesión",
		},
	},
	import: {
		start: {
			en: "New import",
			pt: "Nova importação",
			es: "Nueva importación",
		},
		processing: {
			en: "Importing...",
			pt: "Importando...",
			es: "Importando...",
		},
		success: {
			en: (fileName: string) =>
				`We found these transactions in "${fileName}". Please confirm the transaction from/to accounts, updating errors, so Moneeey will learn and improve future imports.`,
			pt: (fileName: string) =>
				`Encontramos essas transações em "${fileName}". Por favor, confirme as contas de transação de origem/destino, atualizando erros, assim o Moneeey aprenderá e melhorará futuras importações.`,
			es: (fileName: string) =>
				`Encontramos estas transacciones en "${fileName}". Por favor, confirme las cuentas de origen/destino de la transacción, actualizando errores, para que Moneeey aprenda y mejore futuras importaciones.`,
		},
		drop_here: {
			en: "Drop the files here ...",
			pt: "Solte os arquivos aqui ...",
			es: "Suelte los archivos aquí ...",
		},
		click_or_drop_here: {
			en: "Drag and drop files here, or click to select files",
			pt: "Arraste e solte arquivos aqui, ou clique para selecionar arquivos",
			es: "Arrastre y suelte archivos aquí, o haga clic para seleccionar archivos",
		},
		supported_formats: {
			en: "Supported formats: TXT, CSV, OFX, PDF",
			pt: "Formatos suportados: TXT, CSV, OFX, PDF",
			es: "Formatos compatibles: TXT, CSV, OFX, PDF",
		},
		unknown_mode: {
			en: (mode: string) => `Unknown mode ${mode}`,
			pt: (mode: string) => `Modo desconhecido ${mode}`,
			es: (mode: string) => `Modo desconocido ${mode}`,
		},
		new_import: {
			en: "New import",
			pt: "Nova importação",
			es: "Nueva importación",
		},
		configuration: {
			en: "Configuration",
			pt: "Configuração",
			es: "Configuración",
		},
		select_reference_account: {
			en: "Please select reference account",
			pt: "Por favor, selecione a conta de referência",
			es: "Por favor seleccione la cuenta de referencia",
		},
		updated: {
			en: "Updated",
			pt: "Atualizado",
			es: "Actualizado",
		},
		existing: {
			en: "Existing",
			pt: "Existente",
			es: "Existente",
		},
		new: {
			en: "New",
			pt: "Novo",
			es: "Nuevo",
		},
		unchanged: {
			en: "Unchanged",
			pt: "Inalterado",
			es: "Sin cambios",
		},
		import_transactions: {
			en: "Import transactions",
			pt: "Importar transações",
			es: "Importar transacciones",
		},
		invert_from_to_accounts: {
			en: "Invert from and to accounts",
			pt: "Inverter contas de origem e destino",
			es: "Invertir cuentas de origen y destino",
		},
		changed_description: {
			en: (from_value: string, to_value: string) =>
				`Changed from\n${from_value}\nto\n${to_value}`,
			pt: (from_value: string, to_value: string) =>
				`Alterado de\n${from_value}\npara\n${to_value}`,
			es: (from_value: string, to_value: string) =>
				`Cambiado de\n${from_value}\na\n${to_value}`,
		},
	},
	util: {
		name: {
			en: "Name",
			pt: "Nome",
			es: "Nombre",
		},
		tags: {
			en: "Tags",
			pt: "Tags",
			es: "Etiquetas",
		},
		archived: {
			en: "Archived",
			pt: "Arquivado",
			es: "Archivado",
		},
		close: {
			en: "Close",
			pt: "Fechar",
			es: "Cerrar",
		},
		created: {
			en: "Created",
			pt: "Criado",
			es: "Creado",
		},
		delete: {
			en: "Delete",
			pt: "Excluir",
			es: "Eliminar",
		},
		currency: {
			en: "Currency",
			pt: "Moeda",
			es: "Moneda",
		},
		date: {
			en: "Date",
			pt: "Data",
			es: "Fecha",
		},
		date_format: {
			en: "Date format",
			pt: "Formato da data",
			es: "Formato de fecha",
		},
		loading: {
			en: "Loading...",
			pt: "Carregando...",
			es: "Cargando...",
		},
		day: {
			en: "Day",
			pt: "Dia",
			es: "Día",
		},
		week: {
			en: "Week",
			pt: "Semana",
			es: "Semana",
		},
		month: {
			en: "Month",
			pt: "Mês",
			es: "Mes",
		},
		quarter: {
			en: "Quarter",
			pt: "Trimestre",
			es: "Trimestre",
		},
		year: {
			en: "Year",
			pt: "Ano",
			es: "Año",
		},
		ok: {
			en: "Ok",
			pt: "Ok",
			es: "Aceptar",
		},
		cancel: {
			en: "Cancel",
			pt: "Cancelar",
			es: "Cancelar",
		},
		clear: {
			en: "Clear",
			pt: "Limpar",
			es: "Limpiar",
		},
		required: {
			en: "Required",
			pt: "Requerido",
			es: "Requerido",
		},
		global_search_tags: {
			en: "Tags",
			pt: "Tags",
			es: "Etiquetas",
		},
		global_search_text: {
			en: "Search",
			pt: "Texto",
			es: "Texto",
		},
	},
	settings: {
		locale: {
			en: "Locale",
			pt: "Localização",
			es: "Localización",
		},
		reload_page: {
			en: "Reload your page",
			pt: "Recarregue sua página",
			es: "Recargue su página",
		},
		export_data: {
			en: "Export data",
			pt: "Exportar dados",
			es: "Exportar datos",
		},
		import_data: {
			en: "Import data",
			pt: "Importar dados",
			es: "Importar datos",
		},
		clear_all: {
			en: "Clear all data",
			pt: "Limpar todos os dados",
			es: "Borrar todos los datos",
		},
		default_currency: {
			en: "Default currency",
			pt: "Moeda padrão",
			es: "Moneda predeterminada",
		},
		reference_account: {
			en: "Reference account",
			pt: "Conta de referência",
			es: "Cuenta de referencia",
		},
		decimal_separator: {
			en: "Decimal separator",
			pt: "Separador decimal",
			es: "Separador decimal",
		},
		thousand_separator: {
			en: "Thousand separator",
			pt: "Separador de milhar",
			es: "Separador de miles",
		},
		backup_loading: {
			en: (percentage: number) =>
				`Loading your backup data, please wait... ${percentage}%`,
			pt: (percentage: number) =>
				`Carregando seus dados de backup, por favor aguarde... ${percentage}%`,
			es: (percentage: number) =>
				`Cargando sus datos de respaldo, por favor espere... ${percentage}%`,
		},
		restore_loading: {
			en: (percentage: number) =>
				`Restoring your backup data, please wait... ${percentage}%`,
			pt: (percentage: number) =>
				`Restaurando seus dados de backup, por favor aguarde... ${percentage}%`,
			es: (percentage: number) =>
				`Restaurando sus datos de respaldo, por favor espere... ${percentage}%`,
		},
		restore_data_placeholder: {
			en: "Paste your restore data here and click 'Restore data' again",
			pt: "Cole seus dados de restauração aqui e clique em 'Restaurar dados' novamente",
			es: "Pegue sus datos de restauración aquí y haga clic en 'Restaurar datos' nuevamente",
		},
		clear_data_token: {
			en: "DELETE EVERYTHING",
			pt: "EXCLUIR TUDO",
			es: "ELIMINAR TODO",
		},
		clear_data_placeholder: {
			en: "Type 'DELETE EVERYTHING' in this text area and hit 'Clear data' again to delete everything and start from zero.",
			pt: "Digite 'EXCLUIR TUDO' nesta área de texto e pressione 'Limpar dados' novamente para excluir tudo e começar do zero.",
			es: "Escriba 'ELIMINAR TODO' en esta área de texto y presione 'Borrar datos' nuevamente para eliminar todo y comenzar desde cero.",
		},
		create_entity: {
			en: (entity: string) => `Create ${entity}`,
			pt: (entity: string) => `Criar ${entity}`,
			es: (entity: string) => `Crear ${entity}`,
		},
		select_default_currency: {
			en: "Select default currency",
			pt: "Selecionar moeda padrão",
			es: "Seleccionar moneda predeterminada",
		},
		select_language: {
			en: "Select language",
			pt: "Selecionar linguagem",
			es: "Seleccionar idioma",
		},
	},
	budget: {
		budget: {
			en: "Budget",
			pt: "Orçamento",
			es: "Presupuesto",
		},
		new: {
			en: "New budget",
			pt: "Novo orçamento",
			es: "Nuevo presupuesto",
		},
		next: {
			en: "Next",
			pt: "Próximo",
			es: "Siguiente",
		},
		prev: {
			en: "Prev",
			pt: "Anterior",
			es: "Anterior",
		},
		save: {
			en: "Save",
			pt: "Salvar",
			es: "Guardar",
		},
		show_months: {
			en: "Visible months",
			pt: "Meses visíveis",
			es: "Meses visibles",
		},
		show_archived: {
			en: "Show archived budgets",
			pt: "Mostrar orçamentos arquivados",
			es: "Mostrar presupuestos archivados",
		},
		allocated: {
			en: "Allocated",
			pt: "Alocado",
			es: "Asignado",
		},
		used: {
			en: "Used",
			pt: "Usado",
			es: "Usado",
		},
		remaining: {
			en: "Remaining",
			pt: "Restante",
			es: "Restante",
		},
	},
	account: {
		add_account: {
			en: "Create account",
			pt: "Adicionar conta",
			es: "Nueva cuenta",
		},
		offbudget: {
			en: "Off-Budget",
			pt: "Fora do orçamento",
			es: "Fuera del presupuesto",
		},
		account_kind: {
			en: "Type",
			pt: "Tipo",
			es: "Tipo",
		},

		kind_CHECKING: {
			en: "Checking Account",
			pt: "Conta Corrente",
			es: "Cuenta corriente",
		},
		kind_CREDIT_CARD: {
			en: "Credit Card",
			pt: "Cartão de Crédito",
			es: "Tarjeta de crédito",
		},
		kind_INVESTMENT: {
			en: "Investment Account",
			pt: "Conta de Investimento",
			es: "Cuenta de inversión",
		},
		kind_PAYEE: { en: "Payee", pt: "Beneficiário", es: "Beneficiario" },
		kind_SAVINGS: {
			en: "Savings Account",
			pt: "Conta Poupança",
			es: "Cuenta de ahorros",
		},
	},
	new_account: {
		name: {
			en: "New account name",
			pt: "Novo nome da conta",
			es: "Nuevo nombre de cuenta",
		},
		type: {
			en: "Kind",
			pt: "Tipo",
			es: "Tipo",
		},
		currency: {
			en: "Currency",
			pt: "Moeda",
			es: "Moneda",
		},
		initial_balance: {
			en: "Initial balance",
			pt: "Saldo inicial",
			es: "Saldo inicial",
		},
		submit_close: {
			en: "Save and close",
			pt: "Salvar e fechar",
			es: "Guardar y cerrar",
		},
		submit_another: {
			en: "Save and add another",
			pt: "Salvar e adicionar outro",
			es: "Guardar y añadir otro",
		},
	},

	currencies: {
		short: {
			en: "Short name",
			pt: "Nome curto",
			es: "Nombre corto",
		},
		prefix: {
			en: "Prefix",
			pt: "Prefixo",
			es: "Prefijo",
		},
		suffix: {
			en: "Suffix",
			pt: "Sufixo",
			es: "Sufijo",
		},
		decimals: {
			en: "Decimals",
			pt: "Decimais",
			es: "Decimales",
		},
	},

	transactions: {
		amount: {
			en: "Amount",
			pt: "Valor",
			es: "Monto",
		},
		memo: {
			en: "Memo",
			pt: "Memo",
			es: "Memo",
		},
		from_account: {
			en: "From",
			pt: "De",
			es: "Desde",
		},
		to_account: {
			en: "To",
			pt: "Para",
			es: "Hacia",
		},
		running_balance: {
			en: "Running",
			pt: "Saldo em execução",
			es: "Saldo actual",
		},
	},

	dashboard: {
		recent_transactions: {
			en: "Recent transactions",
			pt: "Transações recentes",
			es: "Transacciones recientes",
		},
	},

	reports: {
		account_balance: {
			en: "Account balance",
			pt: "Saldo da conta",
			es: "Saldo de la cuenta",
		},
		payee_balance: {
			en: "Payee balance",
			pt: "Saldo do beneficiário",
			es: "Saldo del beneficiario",
		},
		tag_expenses: {
			en: "Tag expenses",
			pt: "Despesas de tag",
			es: "Gastos de etiqueta",
		},
		wealth_growth: {
			en: "Wealth growth",
			pt: "Crescimento da riqueza",
			es: "Crecimiento de la riqueza",
		},
		income_vs_expenses: {
			en: "Income vs Expenses",
			pt: "Renda vs Despesas",
			es: "Ingresos vs Gastos",
		},
		wealth: {
			en: "Wealth",
			pt: "Riqueza",
			es: "Riqueza",
		},
		income: {
			en: "Income",
			pt: "Renda",
			es: "Ingresos",
		},
		expense: {
			en: "Expense",
			pt: "Despesa",
			es: "Gastos",
		},
		include_accounts: {
			en: "Include accounts:",
			pt: "Incluir contas:",
			es: "Incluir cuentas:",
		},
	},

	modal: {
		landing: {
			en: "Welcome to Moneeey",
			pt: "Bem-vindo ao Moneeey",
			es: "Bienvenido a Moneeey",
		},
		start_tour: {
			en: "Start Tour",
			pt: "Iniciar Tour",
			es: "Comenzar Tour",
		},
		sync: {
			en: "Sync",
			pt: "Sincronizar",
			es: "Sincronizar",
		},
		merge_accounts: {
			en: "Merge accounts",
			pt: "Mesclar contas",
			es: "Fusionar cuentas",
		},
	},

	merge_accounts: {
		submit: {
			en: "Merge accounts",
			pt: "Mesclar contas",
			es: "Fusionar cuentas",
		},
		description: {
			en: "Merge two accounts into a single one, moving all transactions from the source account to the target account.",
			pt: "Mesclar duas contas em uma única, movendo todas as transações da conta de origem para a conta de destino.",
			es: "Fusionar dos cuentas en una sola, moviendo todas las transacciones de la cuenta de origen a la cuenta de destino.",
		},
		source: {
			en: "Source account (deleted)",
			pt: "Conta de origem (excluída)",
			es: "Cuenta de origen (eliminada)",
		},
		target: {
			en: "Target account (merged into)",
			pt: "Conta de destino (mesclada)",
			es: "Cuenta de destino (fusionada)",
		},
		success: {
			en: "Accounts merged successfully",
			pt: "Contas mescladas com sucesso",
			es: "Cuentas fusionadas con éxito",
		},
	},

	sync: {
		intro: {
			en: "Synchronizing your data allows real-time multi-device use of Moneeey, even supporting collaboration.",
			pt: "Sincronizar seus dados permite o uso do Moneeey em vários dispositivos em tempo real, até mesmo para colaboração.",
			es: "Sincronizar sus datos permite el uso de Moneeey en múltiples dispositivos en tiempo real, incluso para colaboración.",
		},
		login_success: {
			en: "Successful login!",
			pt: "Login bem-sucedido!",
			es: "¡Inicio de sesión exitoso!",
		},
		login_started: {
			en: "A confirmation email has been sent. Please confirm by clicking the link.",
			pt: "Um e-mail de confirmação foi enviado. Por favor, confirme clicando no link.",
			es: "Se ha enviado un correo de confirmación. Por favor, confirme haciendo clic en el enlace.",
		},
		login_error: {
			en: "Unable to send login confirmation email.",
			pt: "Não foi possível enviar o e-mail de confirmação de login.",
			es: "No se pudo enviar el correo de confirmación de inicio de sesión.",
		},

		couchdb_url: {
			en: "CouchDB URL",
			pt: "URL do CouchDB",
			es: "URL de CouchDB",
		},
		couchdb_username: {
			en: "CouchDB Username",
			pt: "Nome de usuário do CouchDB",
			es: "Nombre de usuario de CouchDB",
		},
		couchdb_password: {
			en: "CouchDB Password",
			pt: "Senha do CouchDB",
			es: "Contraseña de CouchDB",
		},
		start: {
			en: "Start synchronization",
			pt: "Iniciar sincronização",
			es: "Iniciar sincronización",
		},
		stop: {
			en: "Stop synchronization",
			pt: "Parar sincronização",
			es: "Detener sincronización",
		},

		moneeey_sync: {
			en: "Moneeey Sync",
			pt: "Moneeey Sync",
			es: "Moneeey Sync",
		},

		database_sync: {
			en: "Custom",
			pt: "Custom",
			es: "Custom",
		},
	},

	tour: {
		welcome: {
			en: "Welcome to Moneeey",
			pt: "Bem-vindo ao Moneeey",
			es: "Bienvenido a Moneeey",
		},
		next: {
			en: "Next",
			pt: "Próximo",
			es: "Siguiente",
		},
		prev: {
			en: "Previous",
			pt: "Anterior",
			es: "Anterior",
		},
		continue_language: {
			en: "Continue to default currency selection",
			pt: "Continuar para seleção de moeda padrão",
			es: "Continuar a la selección de moneda predeterminada",
		},
		continue_currency: {
			en: "Continue to Moneeey",
			pt: "Continuar para Moneeey",
			es: "Continuar a Moneeey",
		},
		import: {
			en: "You can import transactions from common banking formats.",
			pt: "Você pode importar transações de formatos bancários comuns.",
			es: "Puede importar transacciones desde formatos bancarios comunes.",
		},
		currencies: {
			en: "Moneeey is multi-currency! We have added the 50 most used currencies in the world. Feel free to add or customize as you like!",
			pt: "O Moneeey é multimoeda! Adicionamos as 50 moedas mais usadas no mundo. Sinta-se à vontade para adicionar ou personalizar como quiser!",
			es: "¡Moneeey es multimoneda! Hemos añadido las 50 monedas más utilizadas en el mundo. ¡Siéntase libre de agregar o personalizar como desee!",
		},
		accounts: {
			en: "You can manage your Accounts in this area. Here, we can add new accounts, change currencies, set them off-budget, and archive accounts.",
			pt: "Você pode gerenciar suas Contas nesta área. Aqui, podemos adicionar novas contas, mudar moedas, configurá-las como fora do orçamento e arquivar contas.",
			es: "Puede gestionar sus Cuentas en esta área. Aquí, podemos agregar nuevas cuentas, cambiar monedas, configurarlas como fuera del presupuesto y archivar cuentas.",
		},
		transactions: {
			en: "Moneeey will generate reports and calculate your data based on Transactions. On the transactions table, we can easily add new payees by starting to type a new name and selecting 'Create'.",
			pt: "O Moneeey gerará relatórios e calculará seus dados com base nas Transações. Na tabela de transações, podemos adicionar facilmente novos beneficiários começando a digitar um novo nome e selecionando 'Criar'.",
			es: "Moneeey generará informes y calculará sus datos basándose en las Transacciones. En la tabla de transacciones, podemos agregar fácilmente nuevos beneficiarios comenzando a escribir un nuevo nombre y seleccionando 'Crear'.",
		},
		budgets: {
			en: "It is time to budget your Moneeey! Budgets are like envelopes where you allocate parts of your income.",
			pt: "É hora de orçar seu Moneeey! Os orçamentos são como envelopes onde você aloca partes de sua renda.",
			es: "¡Es hora de presupuestar su Moneeey! Los presupuestos son como sobres donde asigna partes de sus ingresos.",
		},
		your_turn: {
			en: "Now it's your turn! Time to insert some transactions!",
			pt: "Agora é sua vez! Hora de inserir algumas transações!",
			es: "¡Ahora es tu turno! ¡Hora de insertar algunas transacciones!",
		},
		please_create_budget: {
			en: "Before continuing, please click on 'New Budget' and create a budget.",
			pt: "Antes de continuar, por favor clique em 'Novo Orçamento' e crie um orçamento.",
			es: "Antes de continuar, por favor haga clic en 'Nuevo Presupuesto' y cree un presupuesto.",
		},
		please_create_account: {
			en: "Before continuing, please create an account by typing its information in the table below.",
			pt: "Antes de continuar, por favor crie uma conta digitando suas informações na tabela abaixo.",
			es: "Antes de continuar, por favor cree una cuenta ingresando su información en la tabla a continuación.",
		},
	},
} as const;

type RealLanguageCode = keyof typeof Language.menu.title;
export type LanguageCode = keyof typeof Language.menu.title | "unset";

type ExtractSingleLanguage<T> = {
	[K in keyof T]: {
		[P in keyof T[K]]: T[K][P] extends Record<RealLanguageCode, infer V>
			? V
			: never;
	};
};

function LanguageForCode<L extends LanguageCode>(
	code: L,
): ExtractSingleLanguage<typeof Language> {
	if (code === "unset") {
		return LanguageForCode("en");
	}
	return Object.fromEntries(
		Object.entries(Language).map(([category, entries]) => [
			category,
			Object.fromEntries(
				Object.entries(entries).map(([key, value]) => [
					key,
					(value as Record<LanguageCode, unknown>)[code],
				]),
			),
		]),
	) as ExtractSingleLanguage<typeof Language>;
}

export type LanguageType = ReturnType<typeof LanguageForCode>;

export default LanguageForCode;
