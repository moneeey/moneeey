import { action, makeObservable, observable } from "mobx";

import type { AccountStore, TAccountUUID } from "../entities/Account";
import type { ITransaction, TTransactionUUID } from "../entities/Transaction";
import Logger from "../shared/Logger";

import { asyncProcess } from "./Utils";

type FromToBalance = {
	from_balance: null | number;
	to_balance: null | number;
};

export default class RunningBalance {
	transactionRunningBalance = new Map<TTransactionUUID, FromToBalance>();

	accountBalance = new Map<TAccountUUID, number>();

	version = 0;

	logger: Logger;

	constructor(parent?: Logger) {
		makeObservable(this, {
			transactionRunningBalance: observable,
			accountBalance: observable,
			updateTransactions: action,
			updateAccounts: action,
			version: observable,
			incrementVersion: action,
		});
		this.logger = new Logger("runningBalance", parent);
	}

	incrementVersion() {
		this.version += 1;
	}

	calculateTransactionRunningBalances(items: ITransaction[]) {
		const forVersion = this.version;

		return asyncProcess(
			items,
			(chunk, state) => {
				if (forVersion !== this.version) {
					this.logger.info("calculateTransactionRunningBalances aborted");
					state.aborted = true;

					return;
				}
				const changeRunningBalance = (
					item: ITransaction,
					account: TAccountUUID,
					amount: number,
				) => {
					const previous = state.accountBalance.get(account) || 0;
					const balance = amount + previous;
					state.accountBalance.set(account, balance);

					return balance;
				};
				for (const item of chunk) {
					const from_balance = changeRunningBalance(
						item,
						item.from_account,
						-item.from_value,
					);
					const to_balance = changeRunningBalance(
						item,
						item.to_account,
						item.to_value,
					);
					this.logger.log(
						`calculateTransactionRunningBalances transaction=${item.transaction_uuid}: from=${item.from_account}, to=${item.to_account}, from_balance=${from_balance}, to_balance=${to_balance}`
					);
					state.transactionBalance.set(item.transaction_uuid, {
						from_balance,
						to_balance,
					});
				}
			},
			{
				chunkSize: 50,
				chunkThrottle: 50,
				state: {
					accountBalance: new Map<TAccountUUID, number>(),
					transactionBalance: new Map<TTransactionUUID, FromToBalance>(),
					aborted: false,
				},
			},
		);
	}

	updateTransactions(
		updates: { transaction_uuid: TTransactionUUID; balances: FromToBalance }[],
	) {
		for (const { transaction_uuid, balances } of updates) {
			this.transactionRunningBalance.set(transaction_uuid, balances);
		}
	}

	updateAccounts(updates: { account_uuid: string; balance: number }[]) {
		for (const { account_uuid, balance } of updates) {
			this.accountBalance.set(account_uuid, balance);
		}
	}

	async processAll(transactions: ITransaction[]) {
		this.incrementVersion();
		this.updateTransactions(
			transactions
				.filter((t) => !this.transactionRunningBalance.has(t.transaction_uuid))
				.map((t) => ({
					transaction_uuid: t.transaction_uuid,
					balances: { from_balance: null, to_balance: null },
				})),
		);

		const calc = await this.calculateTransactionRunningBalances(transactions);
		if (!calc.aborted) {
			this.logger.log("calculateTransactionRunningBalances done, applying", calc);
			this.updateTransactions(
				Array.from(calc.transactionBalance.entries()).map(
					([transaction_uuid, balances]) => ({
						transaction_uuid,
						balances,
					}),
				),
			);
			this.updateAccounts(
				Array.from(calc.accountBalance.entries()).map(
					([account_uuid, balance]) => ({ account_uuid, balance }),
				),
			);
			this.incrementVersion();
		}
	}
}
