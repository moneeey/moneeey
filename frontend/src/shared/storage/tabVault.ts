const TAB_VAULT_KEY = "tabVaultId";
const LAST_VAULT_KEY = "lastVaultId";
const DB_NAME_PREFIX = "moneeey";
const BOOTSTRAP_DB_NAME = `${DB_NAME_PREFIX}-bootstrap`;

const readSession = (key: string): string | null => {
	try {
		return globalThis.sessionStorage?.getItem(key) ?? null;
	} catch {
		return null;
	}
};

const writeSession = (key: string, value: string): void => {
	try {
		globalThis.sessionStorage?.setItem(key, value);
	} catch {
		/* sessionStorage may be blocked */
	}
};

const readLocal = (key: string): string | null => {
	try {
		return globalThis.localStorage?.getItem(key) ?? null;
	} catch {
		return null;
	}
};

const writeLocal = (key: string, value: string): void => {
	try {
		globalThis.localStorage?.setItem(key, value);
	} catch {
		/* localStorage may be blocked */
	}
};

export function getTabVaultId(): string | null {
	return readSession(TAB_VAULT_KEY);
}

export function getTabLocalStoreName(): string {
	const tabVault = readSession(TAB_VAULT_KEY);
	if (!tabVault) return BOOTSTRAP_DB_NAME;
	return `${DB_NAME_PREFIX}-${tabVault}`;
}

export function rememberLastVault(vaultId: string): void {
	if (!vaultId) return;
	writeLocal(LAST_VAULT_KEY, vaultId);
}

export function getLastVaultId(): string | null {
	return readLocal(LAST_VAULT_KEY);
}

export function selectVaultForTabAndReload(vaultId: string): void {
	if (!vaultId) return;
	writeSession(TAB_VAULT_KEY, vaultId);
	writeLocal(LAST_VAULT_KEY, vaultId);
	globalThis.location?.reload();
}
