const TAB_VAULT_KEY = "tabVaultId";
const LAST_VAULT_KEY = "lastVaultId";
const LEGACY_DB_NAME = "moneeey";

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
	return tabVault ? `${LEGACY_DB_NAME}-${tabVault}` : LEGACY_DB_NAME;
}

export function rememberLastVault(vaultId: string): void {
	if (!vaultId) return;
	writeLocal(LAST_VAULT_KEY, vaultId);
}

export function selectVaultForTabAndReload(vaultId: string): void {
	if (!vaultId) return;
	writeSession(TAB_VAULT_KEY, vaultId);
	writeLocal(LAST_VAULT_KEY, vaultId);
	globalThis.location?.reload();
}
