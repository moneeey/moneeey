import { isEmpty } from "lodash";
import { action, makeObservable, observable } from "mobx";

import { getCurrentHost } from "../utils/Utils";

import type ConfigStore from "../entities/Config";
import type PersistenceStore from "./Persistence";
import { fetchPasskeyAuthState } from "./encryption/bootstrapFromPasskey";

const wsHostForVault = () =>
	`${getCurrentHost().replace(/^http/, "ws")}/api/vault`;

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
		const stored = this.config.main.moneeeySync;
		if (stored?.enabled && stored.url && stored.sessionToken) {
			this.sessionToken = stored.sessionToken;
			this.vaultId = stored.vaultId;
			this.loggedIn = true;
			this.applySync();
			return;
		}

		const remote = await fetchPasskeyAuthState();
		if (remote) {
			this.complete(remote.sessionToken, remote.vaultId);
		}
	}

	applySync() {
		this.persistence.sync({
			url: wsHostForVault(),
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

			this.config.merge({
				...this.config.main,
				moneeeySync: {
					url: wsHostForVault(),
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
				url: "",
				vaultId: "",
				sessionToken: "",
				enabled: false,
			},
		});

		this.applySync();
	}
}
