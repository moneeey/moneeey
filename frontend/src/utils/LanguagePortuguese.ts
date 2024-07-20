import type { TMessages } from "./Messages";

const Messages: TMessages = {
	menu: {
		title: "Moneeey",
		search: "Pesquisar",
		dashboard: "Painel de Controle",
		transactions: "Transações",
		unassigned: (amount: number) => `Não atribuído (${amount})`,
		balance: (amount: string) => `Saldo: ${amount}`,
		all_transactions: "Todas as transações",
		import: "Importar",
		budget: "Orçamento",
		reports: "Relatórios",
		settings: "Configurações",
		currencies: "Moedas",
		payees: "Beneficiários",
		accounts: "Contas",
		preferences: "Preferências",
		start_tour: "Iniciar tour",
		sync: {
			ONLINE: "Online",
			OFFLINE: "Offline",
			DENIED: "Negado",
			ERROR: "Erro",
		} as Record<string, string>,
	},
	landing: {
		failed: "Login falhou, por favor tente novamente",
		welcome: "Por favor, verifique seu e-mail.",
		title: "Apresentando Moneeey",
		messages: [
			"Orçamento com facilidade usando a interface intuitiva do Moneeey",
			"Alcance a independência financeira e viva a vida ao máximo",
			"Assuma o controle de suas informações sensíveis",
			"Construído com privacidade e segurança em mente",
			"Aproveite a criptografia de ponta a ponta para máxima proteção de dados",
			"Importe e exporte seus dados financeiros sem problemas",
		],
	},
	login: {
		completed: "Bem-vindo, por favor aguarde...",
		auth_code: "Código de autenticação incorreto, por favor tente novamente",
		confirm_code: "Código de confirmação incorreto, por favor tente novamente",
		code_expired: "Código de confirmação expirado, por favor tente novamente",
		login_or_signup: "Entrar ou Inscrever-se",
		email: "E-mail",
		logout: "Sair",
	},
	import: {
		start: "Nova importação",
		processing: "Importando...",
		success: (fileName: string) => `Encontramos essas transações em "${fileName}". Por favor, confirme as contas de transação de
      origem/destino, atualizando erros, assim o Moneeey aprenderá com suas mudanças e será mais inteligente na próxima
      importação.`,
		drop_here: "Solte os arquivos aqui ...",
		click_or_drop_here:
			"Arraste e solte arquivos aqui, ou clique para selecionar arquivos",
		supported_formats: "Formatos suportados: TXT, CSV, OFX, PDF",
		unknown_mode: (mode: string) => `Modo desconhecido ${mode}`,
		new_import: "Nova importação",
		configuration: "Configuração",
		select_reference_account: "Por favor, selecione a conta de referência",
		updated: "Atualizado",
		new: "Novo",
		unchanged: "Inalterado",
		import_transactions: "Importar transações",
		invert_from_to_accounts: "Inverter contas de origem e destino",
		changed_description: (from_value: string, to_value: string) =>
			`Alterado de\n${from_value}\npara\n${to_value}`,
	},
	util: {
		name: "Nome",
		tags: "Tags",
		archived: "Arquivado",
		close: "Fechar",
		created: "Criado",
		delete: "Excluir",
		currency: "Moeda",
		date: "Data",
		date_format: "Formato da data",
		loading: "Carregando...",
		day: "Dia",
		week: "Semana",
		month: "Mês",
		quarter: "Trimestre",
		year: "Ano",
		ok: "Ok",
		cancel: "Cancelar",
		clear: "Limpar",
	},
	settings: {
		reload_page: "Recarregue sua página",
		export_data: "Exportar dados",
		import_data: "Importar dados",
		clear_all: "Limpar todos os dados",
		default_currency: "Moeda padrão",
		reference_account: "Conta de referência",
		decimal_separator: "Separador decimal",
		thousand_separator: "Separador de milhar",
		backup_loading: (percentage: number) =>
			`Carregando seus dados de backup, por favor aguarde... ${percentage}%`,
		restore_loading: (percentage: number) =>
			`Restaurando seus dados de backup, por favor aguarde... ${percentage}%`,
		restore_data_placeholder:
			'Cole seus dados de restauração aqui e clique em "Restaurar dados" novamente',
		clear_data_token: "EXCLUIR TUDO",
		clear_data_placeholder:
			'Digite "EXCLUIR TUDO" nesta área de texto e pressione "Limpar dados" novamente para excluir tudo e começar do zero.',
		create_entity: (entity: string) => `Criar ${entity}`,
		select_language: "Selecionar linguagem",
	},
	budget: {
		budget: "Orçamento",
		new: "Novo orçamento",
		next: "Próximo",
		prev: "Anterior",
		save: "Salvar",
		show_months: "Meses visíveis",
		show_archived: "Mostrar orçamentos arquivados",
		allocated: "Alocado",
		used: "Usado",
		remaining: "Restante",
	},
	account: {
		offbudget: "Fora do orçamento",
		account_kind: "Tipo",
		kind: {
			CHECKING: "Conta Corrente",
			CREDIT_CARD: "Cartão de Crédito",
			INVESTMENT: "Conta de Investimento",
			PAYEE: "Beneficiário",
			SAVINGS: "Conta Poupança",
		} as Record<string, string>,
	},
	currencies: {
		short: "Nome curto",
		prefix: "Prefixo",
		suffix: "Sufixo",
		decimals: "Decimais",
	},
	transactions: {
		amount: "Valor",
		memo: "Memo",
		from_account: "De",
		to_account: "Para",
		running_balance: "Saldo em execução",
	},
	dashboard: {
		recent_transactions: "Transações recentes",
	},
	reports: {
		account_balance: "Saldo da conta",
		payee_balance: "Saldo do beneficiário",
		tag_expenses: "Despesas de tag",
		wealth_growth: "Crescimento da riqueza",
		income_vs_expenses: "Renda vs Despesas",
		wealth: "Riqueza",
		income: "Renda",
		expense: "Despesa",
		include_accounts: "Incluir contas: ",
	},
	modal: {
		landing: "Bem-vindo ao Moneeey",
		start_tour: "Iniciar Tour",
		sync: "Sincronizar",
		merge_accounts: "Mesclar contas",
	},
	merge_accounts: {
		submit: "Mesclar contas",
		description:
			"Mesclar duas contas em uma única, movendo todas as transações da conta de origem para a conta de destino.",
		source: "Conta de origem (excluída)",
		target: "Conta de destino (mesclada em)",
		success: "Contas mescladas com sucesso",
	},
	sync: {
		intro: `Sincronizar seus dados permite que você use o Moneeey em vários dispositivos em tempo real,
      permitindo até mesmo a colaboração em tempo real com pessoas relacionadas.`,
		login: {
			success: "Login bem-sucedido!",
			started:
				"Um e-mail de confirmação de login foi enviado para você, por favor confirme clicando em seu link.",
			error: "Não foi possível enviar o e-mail de confirmação de login.",
		},
		couchdb: {
			url: "URL do CouchDB",
			username: "Nome de usuário do CouchDB",
			password: "Senha do CouchDB",
		},
		start: "Iniciar sincronização",
		stop: "Parar sincronização",
		moneeey_account: "Conta Moneeey",
		database: "Banco de dados",
		select_db: "Selecionar",
	},
	tour: {
		welcome: "Bem-vindo ao Moneeey",
		next: "Próximo",
		prev: "Anterior",

		continue_language: "Continuar para o Moneeey",

		edit_currencies: `Moneeey é multi moeda, por favor edite as moedas para atender às suas necessidades.
      Nós adicionamos as 20 moedas mais usadas de 2020.`,
		create_accounts: `Agora que sabemos as moedas que temos, é hora de nos dizer quais são suas contas:
      cartões de crédito, contas correntes, contas de investimento...`,
		create_budgets: `É hora de orçar seu Moneeey! Orçamentos são como envelopes nos quais você coloca parte de sua renda.
      Você deve criar orçamentos para coisas como: casa/hipoteca, manutenção do carro, serviços públicos, entretenimento...
      Clique em 'Novo orçamento' em um dos períodos`,

		please_create_account:
			"Antes de continuar, por favor crie uma conta digitando suas informações na tabela abaixo.",

		please_create_budget: `Antes de continuar, por favor clique em 'Novo Orçamento' e crie um orçamento.`,

		insert_transactions: `Quando temos nossos orçamentos, é hora de começar a inserir nossas transações!
      Quando o Moneeey conhecer suas transações, ele será capaz de gerar relatórios, calcular o
      uso/restante do orçamento e ajudá-lo a fazer crescer suas finanças.`,
		import: `Inserir transações manualmente pode ser bastante tedioso...
      Então nós permitimos que você importe de formatos bancários comuns!

      Ao importar uma transação, faremos o nosso melhor para adivinhar com quais beneficiários essas transações estão relacionadas.

      Quanto mais transações o Moneeey tiver, mais inteligente ele se torna!`,
		your_turn: `Agora é a sua vez!

      É hora de inserir algumas transações!`,
	},
};

export default Messages;
