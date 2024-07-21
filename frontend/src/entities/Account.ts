import { computed, makeObservable } from "mobx";

import { EntityType, type IBaseEntity } from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import type MoneeeyStore from "../shared/MoneeeyStore";
import { type TDate, currentDateTime } from "../utils/Date";
import { uuid } from "../utils/Utils";

import type { TCurrencyUUID } from "./Currency";

export type TAccountUUID = string;

export enum AccountKind {
	CHECKING = "CHECKING",
	INVESTMENT = "INVESTMENT",
	SAVINGS = "SAVINGS",
	CREDIT_CARD = "CREDIT_CARD",
	PAYEE = "PAYEE",
}

export interface IAccount extends IBaseEntity {
	account_uuid: TAccountUUID;
	currency_uuid: TCurrencyUUID;
	name: string;
	created: TDate;
	kind: AccountKind;
	offbudget: boolean;
	archived: boolean;
}

export class AccountStore extends MappedStore<IAccount> {
	constructor(moneeeyStore: MoneeeyStore) {
		super(moneeeyStore, {
			getUuid: (a: IAccount) => a.account_uuid,
			factory: (id?: string) => ({
				entity_type: EntityType.ACCOUNT,
				name: "",
				account_uuid: id || uuid(),
				tags: [],
				offbudget: false,
				archived: false,
				currency_uuid:
					moneeeyStore.config.main.default_currency ||
					moneeeyStore.currencies.all[0]?.currency_uuid,
				kind: AccountKind.CHECKING,
				created: currentDateTime(),
				updated: currentDateTime(),
			}),
		});

		makeObservable(this, {
			allPayees: computed,
			allNonPayees: computed,
			allActive: computed,
		});
	}

	merge(
		item: IAccount,
		options: { setUpdated: boolean } = { setUpdated: true },
	) {
		const oldName = this.byUuid(item.account_uuid)?.name || "";
		super.merge(item, options);
		if (item.name !== oldName) {
			this.moneeeyStore.tags.unregister(oldName);
		}
		this.moneeeyStore.tags.register(item.name);
	}

	get allActive() {
		return this.all.filter((acct) => !acct.archived);
	}

	get allPayees() {
		return this.all.filter((acct) => acct.kind === AccountKind.PAYEE);
	}

	get allNonPayees() {
		return this.all.filter((acct) => acct.kind !== AccountKind.PAYEE);
	}

	byName(name: string) {
		return this.all.filter((acct) => acct.name === name)[0];
	}

	uuidByName(name: string) {
		return this.byName(name).account_uuid;
	}

	accountTags(account_uuid: TAccountUUID) {
		const acct = this.byUuid(account_uuid);
		if (acct) {
			const currencyTags = this.moneeeyStore.currencies.currencyTags(
				acct.currency_uuid,
			);

			return [acct.name, ...acct.tags, ...currencyTags];
		}

		return [];
	}

	nameForUuid(account_uuid: TAccountUUID) {
		const acct = this.byUuid(account_uuid);
		if (acct) {
			return acct.name;
		}

		return "";
	}

	isArchived(account_uuid: TAccountUUID): boolean {
		const acct = this.byUuid(account_uuid);
		if (acct) {
			return acct.archived === true;
		}

		return true;
	}

	isOffBudget(account_uuid: TAccountUUID): boolean {
		const acct = this.byUuid(account_uuid);
		if (acct) {
			return acct.offbudget === true;
		}

		return true;
	}
}

export default AccountStore;
