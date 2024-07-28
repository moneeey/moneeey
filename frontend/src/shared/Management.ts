import { isEmpty } from "lodash";
import { action, makeObservable, observable } from "mobx";

import { getCurrentHost } from "../utils/Utils";

import type PersistenceStore from "./Persistence";

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

	async post<T>(url: string, body: object, headers?: object): Promise<T> {
		const response = await fetch(url, {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...headers,
			},
		});

		return (await response.json()) as T;
	}

	async start(email: string) {
		const { sent } = await this.post<{ sent: string }>("/api/auth/magic/send", {
			email,
		});

		this.attempts = 0;
		this.startMonitor();

		return Boolean(sent);
	}

	async checkLoggedIn() {
		this.attempts++;
		if (this.attempts > 20) {
			this.stopMonitor();
			return;
		}
		const { authenticated, database, accessToken } = await this.post<{
			authenticated: boolean;
			database: string;
			accessToken: string;
		}>("/api/auth/couch", {});
		if (authenticated && database && accessToken) {
			this.complete(database, accessToken);
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

	complete(database: string, accessToken: string) {
		if (!isEmpty(accessToken)) {
			this.accessToken = accessToken;
			this.database = database;
			this.loggedIn = true;
			this.stopMonitor();
			this.applySync();
		}
	}

	async logout() {
		await this.post<{ authenticated: boolean }>("/api/auth/logout", {});
		this.accessToken = "";
		this.database = "";
		this.loggedIn = false;
		this.applySync();
	}
}
