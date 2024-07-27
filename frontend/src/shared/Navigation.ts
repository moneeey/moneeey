import { action, computed, makeObservable, observable } from "mobx";

import type { StatusType } from "../components/Status";
import { uuid } from "../utils/Utils";

import type { IBudget } from "../entities/Budget";
import Logger from "./Logger";

export enum NavigationModal {
	NONE = "NONE",
	LANDING = "LANDING",
	SYNC = "SYNC",
	MERGE_ACCOUNTS = "MERGE_ACCOUNTS",
	ADD_ACCOUNT = "ADD_ACCOUNT",
}

type NotificationType = StatusType;

export type NotificationData = {
	id: string;
	created: Date;
	type: NotificationType;
	text: string;
};

export default class NavigationStore {
	dateFormat = "dd/MM/yyy";

	navigateToUrl = "";

	currentModal = NavigationModal.NONE;

	notifications: Array<NotificationData> = [];

	logger: Logger;

	currentPath = "/";

	editingBudget?: IBudget;

	constructor(parent: Logger) {
		this.logger = new Logger("navigationStore", parent);

		makeObservable(this, {
			navigateToUrl: observable,
			currentModal: observable,
			notifications: observable,
			clearNotifications: action,
			notify: action,
			navigateTo: computed,
			navigate: action,
			modal: computed,
			openModal: action,
			currentPath: observable,
			updateCurrentPath: action,
			editingBudget: observable,
			updateEditingBudget: action,
		});
	}

	updateCurrentPath(path: string) {
		this.currentPath = path;
	}

	updateEditingBudget(budget?: IBudget) {
		this.editingBudget = budget;
	}

	navigate(url: string) {
		if (url) {
			this.logger.info("navigate", { url });
		}
		this.navigateToUrl = url;
	}

	clearNotifications() {
		this.notifications = [];
	}

	get navigateTo() {
		return this.navigateToUrl;
	}

	get modal() {
		return this.currentModal;
	}

	openModal(modal: NavigationModal) {
		this.logger.info("openModal", { modal });
		this.currentModal = modal;
	}

	closeModal() {
		this.openModal(NavigationModal.NONE);
	}

	notify(type: NotificationType, text: string) {
		const created = new Date();
		this.logger.info("notify", { type, text });
		this.notifications = [
			...this.notifications,
			{ id: uuid(), text, type, created },
		];
	}

	warning(text: string) {
		this.notify("warning", text);
	}

	success(text: string) {
		this.notify("success", text);
	}

	info(text: string) {
		this.notify("info", text);
	}

	error(text: string) {
		this.notify("error", text);
	}
}
