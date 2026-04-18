import { isEmpty } from "lodash";
import { action, makeObservable, observable } from "mobx";

import { getCurrentHost } from "../utils/Utils";

import type ConfigStore from "../entities/Config";
import type PersistenceStore from "./Persistence";
import { fetchPasskeyAuthState } from "./encryption/bootstrapFromPasskey";

export default class ManagementStore {
	accessToken = "";

	database = "";

	loggedIn = false;

	persistence: PersistenceStore;
	config: ConfigStore;

	constructor(persistence: PersistenceStore, config: ConfigStore) {
		makeObservable(this, {
			accessToken: observable,
			database: observable,
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
		if (stored?.enabled && stored.url && stored.password) {
			this.accessToken = stored.password;
			const urlParts = stored.url.split("/db/");
			this.database = urlParts.length > 1 ? urlParts[1] : "";
			this.loggedIn = true;
			this.applySync();
			return;
		}

		const remote = await fetchPasskeyAuthState();
		if (remote) {
			this.complete(remote.password, remote.url);
		}
	}

	applySync() {
		this.persistence.sync({
			url: `${getCurrentHost()}/db/${this.database}`,
			username: "JWT",
			password: this.accessToken,
			enabled: Boolean(this.accessToken),
		});
	}

	complete(accessToken: string, _url: string) {
		if (!isEmpty(accessToken)) {
			this.accessToken = accessToken;
			const urlParts = _url.split("/db/");
			this.database = urlParts.length > 1 ? urlParts[1] : "";
			this.loggedIn = true;

			this.config.merge({
				...this.config.main,
				moneeeySync: {
					url: `${getCurrentHost()}/db/${this.database}`,
					username: "JWT",
					password: this.accessToken,
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
		this.accessToken = "";
		this.database = "";
		this.loggedIn = false;

		this.config.merge({
			...this.config.main,
			moneeeySync: {
				url: "",
				username: "",
				password: "",
				enabled: false,
			},
		});

		this.applySync();
	}
}
