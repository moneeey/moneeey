import { isEmpty } from "lodash";
import { action, makeObservable, observable } from "mobx";

import { getCurrentHost } from "../utils/Utils";

import type PersistenceStore from "./Persistence";
import {
	fetchMagicLinkState,
	startMagicLink,
} from "./encryption/bootstrapFromMoneeeyAccount";

export default class ManagementStore {
	accessToken = "";

	database = "";

	loggedIn = false;

	monitorTmr = 0;

	attempts = 0;

	persistence: PersistenceStore;

	constructor(persistence: PersistenceStore) {
		makeObservable(this, {
			accessToken: observable,
			database: observable,
			loggedIn: observable,
			start: action,
			complete: action,
			logout: action,
		});

		this.persistence = persistence;
		this.checkLoggedIn();
	}

	async start(email: string) {
		const sent = await startMagicLink(email);
		this.attempts = 0;
		this.startMonitor();
		return sent;
	}

	async checkLoggedIn() {
		this.attempts++;
		if (this.attempts > 20) {
			this.stopMonitor();
			return;
		}
		const remote = await fetchMagicLinkState();
		if (remote) {
			this.complete(remote.password, remote.url);
		}
	}

	stopMonitor() {
		clearTimeout(this.monitorTmr);
	}

	startMonitor() {
		this.stopMonitor();
		this.monitorTmr = setTimeout(
			() => {
				this.startMonitor();
				this.checkLoggedIn();
			},
			10000 + this.attempts * 4000,
		);
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
			// Extract database name from the URL returned by fetchMagicLinkState
			// which has the form `${host}/db/${database}`.
			const urlParts = _url.split("/db/");
			this.database = urlParts.length > 1 ? urlParts[1] : "";
			this.loggedIn = true;
			this.stopMonitor();
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
