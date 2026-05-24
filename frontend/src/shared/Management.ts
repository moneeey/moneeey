import { isEmpty } from "lodash";
import { action, makeObservable, observable } from "mobx";

import type ConfigStore from "../entities/Config";
import type PersistenceStore from "./Persistence";
import {
	fetchPasskeyAuthState,
	selectVault,
} from "./encryption/bootstrapFromPasskey";
import { getTabVaultId, rememberVaultForTab } from "./storage/tabVault";

export default class ManagementStore {
	sessionToken = "";
	vaultId = "";
	loggedIn = false;

	persistence: PersistenceStore;
	config: ConfigStore;

	constructor(persistence: PersistenceStore, config: ConfigStore) {
		makeObservable(this, {
			sessionToken: observable,
			vaultId: observable,
			loggedIn: observable,
			complete: action,
			logout: action,
		});

		this.persistence = persistence;
		this.config = config;
		this.checkExistingSession();
	}

	async checkExistingSession() {
		const tabVaultId = getTabVaultId();
		const stored = this.config.main.moneeeySync;
		if (
			stored?.enabled &&
			stored.sessionToken &&
			(!tabVaultId || tabVaultId === stored.vaultId)
		) {
			this.sessionToken = stored.sessionToken;
			this.vaultId = stored.vaultId;
			this.loggedIn = true;
			this.applySync();
			return;
		}

		const remote = await fetchPasskeyAuthState();
		if (!remote) return;
		if (tabVaultId && tabVaultId !== remote.vaultId) {
			try {
				const switched = await selectVault(tabVaultId);
				this.complete(switched.sessionToken, switched.vaultId);
				return;
			} catch (err) {
				console.warn("tab vault no longer accessible, falling back", err);
			}
		}
		this.complete(remote.sessionToken, remote.vaultId);
	}

	applySync() {
		this.persistence.sync({
			vaultId: this.vaultId,
			sessionToken: this.sessionToken,
			enabled: Boolean(this.sessionToken),
		});
	}

	complete(sessionToken: string, vaultId: string) {
		if (!isEmpty(sessionToken)) {
			this.sessionToken = sessionToken;
			this.vaultId = vaultId;
			this.loggedIn = true;
			rememberVaultForTab(vaultId);

			this.config.merge({
				...this.config.main,
				moneeeySync: {
					vaultId,
					sessionToken,
					enabled: true,
				},
			});

			this.applySync();
		}
	}

	async logout() {
		await fetch("/api/auth/logout", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({}),
		});
		this.sessionToken = "";
		this.vaultId = "";
		this.loggedIn = false;

		this.config.merge({
			...this.config.main,
			moneeeySync: {
				vaultId: "",
				sessionToken: "",
				enabled: false,
			},
		});

		this.applySync();
	}
}
