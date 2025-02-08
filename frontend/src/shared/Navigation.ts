import { action, computed, makeObservable, observable } from "mobx";

import type { StatusType } from "../components/Status";
import { uuid } from "../utils/Utils";

import type { IBudget } from "../entities/Budget";
import Logger from "./Logger";
import type { ImportTask } from "./import/ImportContent";

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

	tabsSelectedIndex = new Map<string, number>();

	importingTasks: ImportTask[] = [];

	globalSearchTags: string[] = [];

	globalSearchText = "";

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
			tabsSelectedIndex: observable,
			updateTabsSelectedIndex: action,
			importingTasks: observable,
			updateImportingTasks: action,
			removeImportingTask: action,
			globalSearchText: observable,
			globalSearchTags: observable,
			globalSearch: action,
		});
	}

	globalSearch(search: string, tags: string[]) {
		this.globalSearchTags = Array.from(new Set(tags).values()).sort();
		this.globalSearchText = search;
	}

	globalSearchToggleTags(new_tags: readonly string[]): void {
		this.globalSearch(this.globalSearchText, [
			...this.globalSearchTags,
			...new_tags,
		]);
	}

	updateCurrentPath(path: string) {
		this.currentPath = path;
	}

	updateEditingBudget(budget?: IBudget) {
		this.editingBudget = budget;
	}

	updateTabsSelectedIndex(tabId: string, index: number) {
		this.tabsSelectedIndex.set(tabId, index);
	}

	updateImportingTasks(task: ImportTask) {
		const existing = this.importingTasks.findIndex(
			(t) => t.taskId === task.taskId,
		);
		if (existing >= 0) {
			this.importingTasks[existing] = { ...task };
		} else {
			this.importingTasks = [...this.importingTasks, task];
		}
		this.importingTasks = this.importingTasks.sort((a, b) =>
			a.input.name.localeCompare(b.input.name),
		);
	}

	removeImportingTask(task: ImportTask) {
		this.importingTasks = this.importingTasks.filter(
			(t) => t.taskId !== task.taskId,
		);
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
