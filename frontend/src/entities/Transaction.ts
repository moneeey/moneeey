import { computed, makeObservable, observable } from "mobx";

import { debounce, isEmpty } from "lodash";

import {
	EntityType,
	type IBaseEntity,
	type TMonetary,
	isEntityType,
} from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import type MoneeeyStore from "../shared/MoneeeyStore";
import {
	type TDate,
	compareDates,
	currentDate,
	currentDateTime,
	parseDate,
} from "../utils/Date";
import RunningBalance from "../utils/RunningBalance";
import { uuid } from "../utils/Utils";

import type { AccountStore, TAccountUUID } from "./Account";

export type TTransactionUUID = string;

export interface ITransaction extends IBaseEntity {
	transaction_uuid: TTransactionUUID;
	date: TDate;
	from_account: TAccountUUID;
	to_account: TAccountUUID;
	from_value: TMonetary;
	to_value: TMonetary;
	memo: string;
	import_data?: string;
}

export default class TransactionStore extends MappedStore<ITransaction> {
	oldest_dt: Date = new Date();

	newest_dt: Date = new Date();

	runningBalance: RunningBalance;

	constructor(moneeeyStore: MoneeeyStore) {
		super(moneeeyStore, {
			getUuid: (t) => t.transaction_uuid,
			factory: (id?: string) => ({
				entity_type: EntityType.TRANSACTION,
				transaction_uuid: id || uuid(),
				date: currentDate(),
				from_account: "",
				to_account: "",
				from_value: 0,
				to_value: 0,
				memo: "",
				tags: [],
				updated: currentDateTime(),
				created: currentDateTime(),
			}),
		});
		makeObservable(this, {
			sorted: computed,
			oldest_dt: observable,
			newest_dt: observable,
		});
		this.runningBalance = new RunningBalance(this.moneeeyStore.logger);
	}

	updateRunningBalance = debounce(() => {
		this.runningBalance.processAll(this.moneeeyStore.transactions.sorted);
	}, 1000);

	merge(
		item: ITransaction,
		options: { setUpdated: boolean } = { setUpdated: true },
	) {
		if (item.from_value < 0 || item.to_value < 0) {
			throw new Error("Transaction amounts must be positive numbers");
		}
		
		super.merge(item, options);
		if (!isEmpty(item.date)) {
			const dt = parseDate(item.date);
			if (dt) {
				if (dt.getTime() > this.newest_dt.getTime()) {
					this.newest_dt = new Date(dt);
				}
				if (dt.getTime() < this.oldest_dt.getTime()) {
					this.oldest_dt = new Date(dt);
				}
			}
			this.updateRunningBalance();
		}
	}

	sortTransactions(transactions: ITransaction[]): ITransaction[] {
		return transactions.sort((a, b) => compareDates(a.date, b.date));
	}

	get sorted() {
		return this.sortTransactions(this.all);
	}

	findAllAfter(date: TDate) {
		return this.sorted.filter((t) => t.date >= date);
	}

	viewAllWithAccount(account: TAccountUUID) {
		return this.viewAllWithAccounts([account]);
	}

	filterByAccounts(accounts: TAccountUUID[]) {
		const accountSet = new Set(accounts);

		return (row: ITransaction) =>
			accountSet.has(row.from_account) ||
			accountSet.has(row.to_account) ||
			(accountSet.size === 0 &&
				(row.from_account === "" || row.to_account === ""));
	}

	viewAllWithAccounts(accounts: TAccountUUID[]) {
		return this.sortTransactions(
			this.byPredicate(this.filterByAccounts(accounts)),
		);
	}

	viewAllUnclassified() {
		return this.sortTransactions(this.byPredicate(this.filterByAccounts([])));
	}

	filterByTag(tag: string, accountsStore: AccountStore) {
		return (row: ITransaction) =>
			this.getAllTransactionTags(row, accountsStore)
				.map((taag) => taag.toLowerCase())
				.indexOf(tag.toLowerCase()) >= 0;
	}

	viewAllWithTag(tag: string, accountsStore: AccountStore) {
		return this.sortTransactions(
			this.byPredicate(this.filterByTag(tag, accountsStore)),
		);
	}

	viewAllNonPayees(accountsStore: AccountStore) {
		return this.viewAllWithAccounts(
			accountsStore.allNonPayees.map((act) => act.account_uuid),
		);
	}

	getAllTransactionTags(
		transaction: ITransaction,
		accountsStore: AccountStore,
	) {
		const from_acct = accountsStore.accountTags(transaction.from_account);
		const to_acct = accountsStore.accountTags(transaction.to_account);

		return [...from_acct, ...to_acct, ...transaction.tags];
	}

	getSearchBuffer(transaction: ITransaction, accountsStore: AccountStore) {
		return `${this.getAllTransactionTags(transaction, accountsStore).join("@.@")} ${transaction.memo} ${transaction.date}`;
	}

	replaceAccount(from_uuid: TAccountUUID, to_uuid: TAccountUUID) {
		for (const t of this.viewAllWithAccount(from_uuid)) {
			const from_account =
				t.from_account === from_uuid ? to_uuid : t.from_account;
			const to_account = t.to_account === from_uuid ? to_uuid : t.to_account;
			this.merge({ ...t, from_account, to_account });
		}
	}
}

export const isTransaction = isEntityType<ITransaction>(EntityType.TRANSACTION);

export const mockTransaction = (
	data: Pick<
		ITransaction,
		"transaction_uuid" | "from_account" | "to_account" | "from_value"
	> &
		Partial<ITransaction>,
) => ({
	entity_type: EntityType.TRANSACTION,
	to_value: data.from_value,
	date: "2023-02-01",
	memo: "",
	tags: [],
	...data,
});
