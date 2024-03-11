import { TMessages } from './Messages';

const Messages: TMessages = {
  menu: {
    title: 'Moneeey',
    search: 'Buscar',
    dashboard: 'Panel de control',
    transactions: 'Transacciones',
    unassigned: (amount: number) => `Sin asignar (${amount})`,
    balance: (amount: string) => `Saldo: ${amount}`,
    all_transactions: 'Todas las transacciones',
    import: 'Importar',
    budget: 'Presupuesto',
    reports: 'Informes',
    settings: 'Configuración',
    currencies: 'Monedas',
    payees: 'Beneficiarios',
    accounts: 'Cuentas',
    preferences: 'Preferencias',
    start_tour: 'Comenzar tour',
    sync: {
      ONLINE: 'En línea',
      OFFLINE: 'Fuera de línea',
      DENIED: 'Denegado',
      ERROR: 'Error',
    } as Record<string, string>,
  },
  landing: {
    failed: 'Inicio de sesión fallido, por favor intente de nuevo',
    welcome: 'Por favor, revise su correo electrónico.',
    title: 'Presentando Moneeey',
    messages: [
      'Presupueste con facilidad utilizando la interfaz intuitiva de Moneeey',
      'Logre la independencia financiera y viva la vida al máximo',
      'Tome posesión de su información sensible',
      'Construido con la privacidad y seguridad en mente',
      'Disfrute de la encriptación de extremo a extremo para la máxima protección de datos',
      'Importe y exporte sus datos financieros sin problemas',
    ],
  },
  login: {
    completed: 'Bienvenido, por favor espere...',
    auth_code: 'Código de autenticación incorrecto, por favor intente de nuevo',
    confirm_code: 'Código de confirmación incorrecto, por favor intente de nuevo',
    code_expired: 'Código de confirmación caducado, por favor intente de nuevo',
    login_or_signup: 'Iniciar sesión o Registrarse',
    email: 'Correo electrónico',
    logout: 'Cerrar sesión',
  },
  import: {
    start: 'Nueva importación',
    processing: 'Importando...',
    success: (fileName: string) => `Encontramos estas transacciones en "${fileName}". Por favor, confirme las cuentas de
      origen/destino de la transacción, actualizando errores, de esa manera Moneeey aprenderá de sus cambios y será más
      inteligente en la próxima importación.`,
    drop_here: 'Suelte los archivos aquí ...',
    click_or_drop_here: 'Arrastre y suelte archivos aquí, o haga clic para seleccionar archivos',
    supported_formats: 'Formatos compatibles: TXT, CSV, OFX, PDF',
    unknown_mode: (mode: string) => `Modo desconocido ${mode}`,
    new_import: 'Nueva importación',
    configuration: 'Configuración',
    select_reference_account: 'Por favor seleccione la cuenta de referencia',
    updated: 'Actualizado',
    new: 'Nuevo',
    unchanged: 'Sin cambios',
    import_transactions: 'Importar transacciones',
    invert_from_to_accounts: 'Invertir cuentas de origen y destino',
    changed_description: (from_value: string, to_value: string) => `Cambiado de\n${from_value}\na\n${to_value}`,
  },
  util: {
    name: 'Nombre',
    tags: 'Etiquetas',
    archived: 'Archivado',
    close: 'Cerrar',
    created: 'Creado',
    delete: 'Eliminar',
    currency: 'Moneda',
    date: 'Fecha',
    date_format: 'Formato de fecha',
    loading: 'Cargando...',
    day: 'Día',
    week: 'Semana',
    month: 'Mes',
    quarter: 'Trimestre',
    year: 'Año',
    ok: 'Aceptar',
    cancel: 'Cancelar',
    clear: 'Limpiar',
  },
  settings: {
    reload_page: 'Recargue su página',
    export_data: 'Exportar datos',
    import_data: 'Importar datos',
    clear_all: 'Borrar todos los datos',
    default_currency: 'Moneda predeterminada',
    reference_account: 'Cuenta de referencia',
    decimal_separator: 'Separador decimal',
    thousand_separator: 'Separador de miles',
    backup_loading: (percentage: number) => `Cargando sus datos de respaldo, por favor espere... ${percentage}%`,
    restore_loading: (percentage: number) => `Restaurando sus datos de respaldo, por favor espere... ${percentage}%`,
    restore_data_placeholder: 'Pegue sus datos de restauración aquí y haga clic en "Restaurar datos" nuevamente',
    clear_data_token: 'ELIMINAR TODO',
    clear_data_placeholder: 'Escriba "ELIMINAR TODO" en esta área de texto y presione "Borrar datos" nuevamente para eliminar todo y comenzar desde cero.',
    create_entity: (entity: string) => `Crear ${entity}`,
    select_language: 'Seleccionar idioma',
  },
  budget: {
    budget: 'Presupuesto',
    new: 'Nuevo presupuesto',
    next: 'Siguiente',
    prev: 'Anterior',
    save: 'Guardar',
    show_months: 'Meses visibles',
    show_archived: 'Mostrar presupuestos archivados',
    allocated: 'Asignado',
    used: 'Usado',
    remaining: 'Restante',
  },
  account: {
    offbudget: 'Fuera del presupuesto',
    account_kind: 'Tipo',
    kind: {
      CHECKING: 'Cuenta corriente',
      CREDIT_CARD: 'Tarjeta de crédito',
      INVESTMENT: 'Cuenta de inversión',
      PAYEE: 'Beneficiario',
      SAVINGS: 'Cuenta de ahorros',
    } as Record<string, string>,
  },
  currencies: {
    short: 'Nombre corto',
    prefix: 'Prefijo',
    suffix: 'Sufijo',
    decimals: 'Decimales',
  },
  transactions: {
    amount: 'Monto',
    memo: 'Memo',
    from_account: 'Desde',
    to_account: 'Hacia',
    running_balance: 'Saldo actual',
  },
  dashboard: {
    recent_transactions: 'Transacciones recientes',
  },
  reports: {
    account_balance: 'Saldo de la cuenta',
    payee_balance: 'Saldo del beneficiario',
    tag_expenses: 'Gastos de etiqueta',
    wealth_growth: 'Crecimiento de la riqueza',
    income_vs_expenses: 'Ingresos vs Gastos',
    wealth: 'Riqueza',
    income: 'Ingresos',
    expense: 'Gastos',
    include_accounts: 'Incluir cuentas: ',
  },
  modal: {
    landing: 'Bienvenido a Moneeey',
    start_tour: 'Comenzar Tour',
    sync: 'Sincronizar',
    merge_accounts: 'Fusionar cuentas',
  },
  merge_accounts: {
    submit: 'Fusionar cuentas',
    description: 'Fusionar dos cuentas en una sola, moviendo todas las transacciones de la cuenta de origen a la cuenta de destino.',
    source: 'Cuenta de origen (eliminada)',
    target: 'Cuenta de destino (fusionada en)',
    success: 'Cuentas fusionadas con éxito',
  },
  sync: {
    intro: `Sincronizar sus datos le permite usar Moneeey desde múltiples dispositivos en tiempo real,
      permitiendo incluso la colaboración en tiempo real con personas relacionadas.`,
    login: {
      success: '¡Inicio de sesión exitoso!',
      started: 'Se envió un correo electrónico de confirmación de inicio de sesión, por favor confirme haciendo clic en su enlace.',
      error: 'No se pudo enviar el correo electrónico de confirmación de inicio de sesión.',
    },
    couchdb: {
      url: 'URL de CouchDB',
      username: 'Nombre de usuario de CouchDB',
      password: 'Contraseña de CouchDB',
    },
    start: 'Iniciar sincronización',
    stop: 'Detener sincronización',
    moneeey_account: 'Cuenta de Moneeey',
    database: 'Base de datos',
    select_db: 'Seleccionar',
  },
  tour: {
    welcome: 'Bienvenido a Moneeey',
    next: 'Siguiente',
    prev: 'Anterior',

    edit_currencies: `Moneeey es multi moneda, por favor edite las monedas para adaptarlas a sus necesidades. Hemos añadido
      las 20 monedas más utilizadas de 2020.`,
    create_accounts: `Ahora que conocemos las monedas que tenemos, es hora de decirnos cuáles son sus cuentas:
      tarjetas de crédito, cuentas corrientes, cuentas de inversión...`,
    create_budgets: `¡Es hora de presupuestar su Moneeey! Los presupuestos son como sobres en los que pone parte de sus ingresos.

      Debería crear presupuestos para cosas como:
      vivienda/hipoteca, mantenimiento del coche, servicios públicos, entretenimiento...

      Haga clic en 'Nuevo presupuesto' en uno de los períodos`,

    please_create_account: `Antes de continuar, por favor cree una cuenta escribiendo su información en la tabla de abajo.`,

    please_create_budget: `Antes de continuar, por favor haga clic en 'Nuevo Presupuesto' y cree un presupuesto.`,

    insert_transactions: `¡Cuando tenemos nuestros presupuestos, es hora de empezar a insertar nuestras transacciones!
      Cuando Moneeey conozca sus transacciones, será capaz de generar informes, calcular el uso/restante del presupuesto
      y ayudarle a hacer crecer sus finanzas.`,
    import: `¡Insertar transacciones manualmente puede ser bastante aburrido...
      Así que le permitimos importar desde formatos bancarios comunes!

      Cuando importe una transacción, haremos todo lo posible para adivinar con qué beneficiarios están relacionadas esas transacciones.

      ¡Cuanto más transacciones tenga Moneeey, más inteligente se vuelve!`,
    your_turn: `¡Ahora es tu turno!

      ¡Es hora de insertar algunas transacciones!`,
  },
};

export default Messages;
