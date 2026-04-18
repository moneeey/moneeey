import { isEmpty } from "lodash";
import { action, makeObservable, observable } from "mobx";

import { getCurrentHost } from "../utils/Utils";

import type PersistenceStore from "./Persistence";
import { fetchPasskeyAuthState } from "./encryption/bootstrapFromPasskey";

export default class ManagementStore {
	accessToken = "";

	database = "";

	loggedIn = false;

	persistence: PersistenceStore;

	constructor(persistence: PersistenceStore) {
		makeObservable(this, {
			accessToken: observable,
			database: observable,
			loggedIn: observable,
			complete: action,
			logout: action,
		});

		this.persistence = persistence;
		this.checkExistingSession();
	}

	async checkExistingSession() {
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
		this.applySync();
	}
}
