export interface ISeededUser {
	displayName: string;
	credentialId: string;
	userHandle: string;
	privateKeyJwk: JsonWebKey;
	vaultId: string;
	sessionToken: string;
	counter: number;
}

export async function loadUsers(path: string): Promise<ISeededUser[]> {
	try {
		return JSON.parse(await Deno.readTextFile(path)) as ISeededUser[];
	} catch {
		return [];
	}
}

export function createSaver(
	path: string,
): (users: ISeededUser[]) => Promise<void> {
	let chain: Promise<void> = Promise.resolve();
	return (users: ISeededUser[]) => {
		chain = chain.then(() =>
			Deno.writeTextFile(path, JSON.stringify(users, null, 2)),
		);
		return chain;
	};
}
