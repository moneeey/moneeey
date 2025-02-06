import type { TMessages } from "./Messages";

const Messages: TMessages = {
	menu: {
		title: "Moneeey",
		search: "Buscar",
		dashboard: "Panel de control",
		transactions: "Transacciones",
		unassigned: (amount: number) => `Sin asignar (${amount})`,
		balance: (amount: string) => `Saldo: ${amount}`,
		all_transactions: "Todas las transacciones",
		import: "Importar",
		budget: "Presupuesto",
		reports: "Informes",
		settings: "Configuración",
		currencies: "Monedas",
		payees: "Beneficiarios",
		accounts: "Cuentas",
		preferences: "Preferencias",
		start_tour: "Comenzar tour",
		sync: {
			ONLINE: "En línea",
			OFFLINE: "Fuera de línea",
			DENIED: "Denegado",
			ERROR: "Error",
		} as Record<string, string>,
	},
	landing: {
		failed: "Inicio de sesión fallido, por favor intente de nuevo",
		welcome: "Por favor, revise su correo electrónico.",
		title: "Presentando Moneeey",
		messages: [
			"Presupueste con facilidad utilizando la interfaz intuitiva de Moneeey",
			"Logre la independencia financiera y viva la vida al máximo",
			"Tome posesión de su información sensible",
			"Construido con la privacidad y seguridad en mente",
			"Disfrute de la encriptación de extremo a extremo para la máxima protección de datos",
			"Importe y exporte sus datos financieros sin problemas",
		],
	},
	login: {
		completed: "Bienvenido, por favor espere...",
		auth_code: "Código de autenticación incorrecto, por favor intente de nuevo",
		confirm_code:
			"Código de confirmación incorrecto, por favor intente de nuevo",
		code_expired: "Código de confirmación caducado, por favor intente de nuevo",
		login_or_signup: "Iniciar sesión o Registrarse",
		email: "Correo electrónico",
		logout: "Cerrar sesión",
	},
	import: {
		start: "Nueva importación",
		processing: "Importando...",
		success: (
			fileName: string,
		) => `Encontramos estas transacciones en "${fileName}". Por favor, confirme las cuentas de
      origen/destino de la transacción, actualizando errores, de esa manera Moneeey aprenderá de sus cambios y será más
      inteligente en la próxima importación.`,
		drop_here: "Suelte los archivos aquí ...",
		click_or_drop_here:
			"Arrastre y suelte archivos aquí, o haga clic para seleccionar archivos",
		supported_formats: "Formatos compatibles: TXT, CSV, OFX, PDF",
		unknown_mode: (mode: string) => `Modo desconocido ${mode}`,
		new_import: "Nueva importación",
		configuration: "Configuración",
		select_reference_account: "Por favor seleccione la cuenta de referencia",
		updated: "Actualizado",
		existing: "Existente",
		new: "Nuevo",
		unchanged: "Sin cambios",
		import_transactions: "Importar transacciones",
		invert_from_to_accounts: "Invertir cuentas de origen y destino",
		changed_description: (from_value: string, to_value: string) =>
			`Cambiado de\n${from_value}\na\n${to_value}`,
	},
	util: {
		name: "Nombre",
		tags: "Etiquetas",
		archived: "Archivado",
		close: "Cerrar",
		created: "Creado",
		delete: "Eliminar",
		currency: "Moneda",
		date: "Fecha",
		date_format: "Formato de fecha",
		loading: "Cargando...",
		day: "Día",
		week: "Semana",
		month: "Mes",
		quarter: "Trimestre",
		year: "Año",
		ok: "Aceptar",
		cancel: "Cancelar",
		clear: "Limpiar",
		required: "Requerido",
    global_search_tags: 'Etiquetas',
    global_search_text: 'Texto',
	},
	settings: {
		locale: "localización",
		reload_page: "Recargue su página",
		export_data: "Exportar datos",
		import_data: "Importar datos",
		clear_all: "Borrar todos los datos",
		default_currency: "Moneda predeterminada",
		reference_account: "Cuenta de referencia",
		decimal_separator: "Separador decimal",
		thousand_separator: "Separador de miles",
		backup_loading: (percentage: number) =>
			`Cargando sus datos de respaldo, por favor espere... ${percentage}%`,
		restore_loading: (percentage: number) =>
			`Restaurando sus datos de respaldo, por favor espere... ${percentage}%`,
		restore_data_placeholder:
			'Pegue sus datos de restauración aquí y haga clic en "Restaurar datos" nuevamente',
		clear_data_token: "ELIMINAR TODO",
		clear_data_placeholder:
			'Escriba "ELIMINAR TODO" en esta área de texto y presione "Borrar datos" nuevamente para eliminar todo y comenzar desde cero.',
		create_entity: (entity: string) => `Crear ${entity}`,
		select_default_currency: "Seleccionar moneda predeterminada",
		select_language: "Seleccionar idioma",
	},
	budget: {
		budget: "Presupuesto",
		new: "Nuevo presupuesto",
		next: "Siguiente",
		prev: "Anterior",
		save: "Guardar",
		show_months: "Meses visibles",
		show_archived: "Mostrar presupuestos archivados",
		allocated: "Asignado",
		used: "Usado",
		remaining: "Restante",
	},
	account: {
		add_account: "Nueva cuenta",
		offbudget: "Fuera del presupuesto",
		account_kind: "Tipo",
		kind: {
			CHECKING: "Cuenta corriente",
			CREDIT_CARD: "Tarjeta de crédito",
			INVESTMENT: "Cuenta de inversión",
			PAYEE: "Beneficiario",
			SAVINGS: "Cuenta de ahorros",
		} as Record<string, string>,
	},
	new_account: {
		name: "Nuevo nombre de cuenta",
		type: "Tipo",
		currency: "Moneda",
		initial_balance: "Saldo inicial",
		submit_close: "Guardar y cerrar",
		submit_another: "Guardar y añadir otro",
	},
	currencies: {
		short: "Nombre corto",
		prefix: "Prefijo",
		suffix: "Sufijo",
		decimals: "Decimales",
	},
	transactions: {
		amount: "Monto",
		memo: "Memo",
		from_account: "Desde",
		to_account: "Hacia",
		running_balance: "Saldo actual",
	},
	dashboard: {
		recent_transactions: "Transacciones recientes",
	},
	reports: {
		account_balance: "Saldo de la cuenta",
		payee_balance: "Saldo del beneficiario",
		tag_expenses: "Gastos de etiqueta",
		wealth_growth: "Crecimiento de la riqueza",
		income_vs_expenses: "Ingresos vs Gastos",
		wealth: "Riqueza",
		income: "Ingresos",
		expense: "Gastos",
		include_accounts: "Incluir cuentas: ",
	},
	modal: {
		landing: "Bienvenido a Moneeey",
		start_tour: "Comenzar Tour",
		sync: "Sincronizar",
		merge_accounts: "Fusionar cuentas",
	},
	merge_accounts: {
		submit: "Fusionar cuentas",
		description:
			"Fusionar dos cuentas en una sola, moviendo todas las transacciones de la cuenta de origen a la cuenta de destino.",
		source: "Cuenta de origen (eliminada)",
		target: "Cuenta de destino (fusionada en)",
		success: "Cuentas fusionadas con éxito",
	},
	sync: {
		intro: `Sincronizar sus datos le permite usar Moneeey desde múltiples dispositivos en tiempo real,
      permitiendo incluso la colaboración en tiempo real con personas relacionadas.`,
		login: {
			success: "¡Inicio de sesión exitoso!",
			started:
				"Se envió un correo electrónico de confirmación de inicio de sesión, por favor confirme haciendo clic en su enlace.",
			error:
				"No se pudo enviar el correo electrónico de confirmación de inicio de sesión.",
		},
		couchdb: {
			url: "URL de CouchDB",
			username: "Nombre de usuario de CouchDB",
			password: "Contraseña de CouchDB",
		},
		start: "Iniciar sincronización",
		stop: "Detener sincronización",
		moneeey_account: "Cuenta de Moneeey",
		database: "Base de datos",
		select_db: "Seleccionar",
	},
	tour: {
		welcome: "Bienvenido a Moneeey",
		next: "Siguiente",
		prev: "Anterior",

		continue_language: "Continuar a la selección de moneda predeterminada",
		continue_currency: "Continuar a Moneeey",

		currencies: `¡Moneeey es multimoneda!
      Hemos añadido las 50 monedas más utilizadas en el mundo.
      ¡Siéntase libre de agregar o personalizar como desee!

    Haga clic en 'Siguiente' para continuar.`,
		accounts: `Puede gestionar sus Cuentas en esta área.
      Aquí, podemos agregar nuevas cuentas, cambiar monedas,
      configurarlas para estar fuera del presupuesto y archivar cuentas.

    Haga clic en 'Siguiente' para continuar.`,
		transactions: `Moneeey generará informes y
      calculará sus datos basándose en las filas de Transacciones.

      Al mirar las transacciones de una Cuenta específica,
      aparecerá una columna de Ejecución con el saldo
      en curso.

      En la tabla de transacciones, podemos agregar fácilmente nuevos beneficiarios
      comenzando a escribir un nuevo nombre de beneficiario y seleccionando
      la opción "Crear 'nombre escrito'".

    Haga clic en 'Siguiente' para continuar.`,
		budgets: `¡Es hora de presupuestar tu Moneeey! Los presupuestos son como sobres en los que pones parte de tus ingresos.

      Deberías crear presupuestos para cosas como:
        hogar/hipoteca, mantenimiento del coche, servicios públicos, entretenimiento...

      ¡Estos presupuestos se calcularán en tiempo real y te permitirán llevar un control y límites en tu Moneeey!

      Haga clic en el botón 'Nuevo presupuesto' y cree un nuevo presupuesto`,

		please_create_account: `Antes de continuar, por favor cree una cuenta ingresando su información en la tabla a continuación.
    `,

		please_create_budget: `Antes de continuar, por favor haga clic en 'Nuevo Presupuesto' y cree un presupuesto.
    `,

		import: `Insertar transacciones manualmente puede ser bastante aburrido... ¡Así que te permitimos importar desde formatos bancarios comunes!

      Al importar una transacción, haremos todo lo posible para adivinar a qué beneficiarios están relacionadas esas transacciones.

      ¡Cuantas más transacciones tenga Moneeey, más inteligente se vuelve!`,
		your_turn: `¡Ahora es tu turno!

      ¡Hora de insertar algunas transacciones!`,
	},
};

export default Messages;
