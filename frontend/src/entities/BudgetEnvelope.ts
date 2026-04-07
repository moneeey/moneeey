import { action, computed, makeObservable, observable } from "mobx";

import { EntityType, type IBaseEntity, type TMonetary } from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import type MoneeeyStore from "../shared/MoneeeyStore";
import {
	type TDate,
	formatDate,
	parseDate,
	startOfMonthOffset,
} from "../utils/Date";

import type { AccountStore } from "./Account";
import type { IBudget, TBudgetUUID } from "./Budget";
import type { TCurrencyUUID } from "./Currency";
import type { ITransaction } from "./Transaction";

const BudgetEnvelopeKey = (
	budget_uuid: TBudgetUUID,
	starting: TDate,
	currency_uuid: TCurrencyUUID,
) => `${starting}_${budget_uuid}_${currency_uuid}`;

export type EnvelopeData = {
	budget_uuid: TBudgetUUID;
	currency_uuid: TCurrencyUUID;
	starting: TDate;
	allocated: number;
	used: number;
	remaining: number;
};

/**
 * Pure function that computes all budget envelope data from budgets,
 * transactions, and accounts. No MobX inside — suitable for @computed.
 */
function computeEnvelopes(
	budgets: IBudget[],
	transactions: ITransaction[],
	accounts: AccountStore,
	defaultCurrency: TCurrencyUUID,
	seededMonths: Set<TDate>,
): Map<string, EnvelopeData> {
	// 1. Pre-build tag-to-budget index
	const tagIndex = new Map<string, IBudget[]>();
	for (const budget of budgets) {
		for (const tag of budget.tags || []) {
			const list = tagIndex.get(tag);
			if (list) {
				list.push(budget);
			} else {
				tagIndex.set(tag, [budget]);
			}
		}
	}

	// Helper: find budgets matching any of the given tags
	const findBudgets = (tags: string[]): IBudget[] => {
		const result: IBudget[] = [];
		const seen = new Set<TBudgetUUID>();
		for (const tag of tags) {
			const matching = tagIndex.get(tag);
			if (matching) {
				for (const budget of matching) {
					if (!seen.has(budget.budget_uuid)) {
						seen.add(budget.budget_uuid);
						result.push(budget);
					}
				}
			}
		}
		return result;
	};

	// 2. Accumulate usage from on-budget transactions
	const usages = new Map<string, number>();
	const currenciesByBudget = new Map<TBudgetUUID, Set<TCurrencyUUID>>();

	const onBudgetTransactions = transactions.filter(
		(t) =>
			!accounts.isOffBudget(t.from_account) &&
			!accounts.isOffBudget(t.to_account),
	);

	for (const transaction of onBudgetTransactions) {
		const starting = formatDate(
			startOfMonthOffset(parseDate(transaction.date), 0),
		);

		const fromTags = accounts.accountTags(transaction.from_account);
		const toTags = accounts.accountTags(transaction.to_account);
		const allTags = [...fromTags, ...toTags, ...transaction.tags];

		const matchingBudgets = findBudgets(allTags);

		const fromAccount = accounts.byUuid(transaction.from_account);
		const txCurrency = fromAccount?.currency_uuid || defaultCurrency;

		for (const budget of matchingBudgets) {
			const key = BudgetEnvelopeKey(budget.budget_uuid, starting, txCurrency);
			usages.set(key, (usages.get(key) || 0) + transaction.from_value);

			// Track currencies per budget for fill-forward
			let currencies = currenciesByBudget.get(budget.budget_uuid);
			if (!currencies) {
				currencies = new Set<TCurrencyUUID>();
				currenciesByBudget.set(budget.budget_uuid, currencies);
			}
			currencies.add(txCurrency);
		}
	}

	// 3. Build the envelope map with allocated values
	const envelopes = new Map<string, EnvelopeData>();

	const getOrCreate = (
		budget: IBudget,
		starting: TDate,
		currency_uuid: TCurrencyUUID,
	): EnvelopeData => {
		const key = BudgetEnvelopeKey(budget.budget_uuid, starting, currency_uuid);
		let env = envelopes.get(key);
		if (!env) {
			const allocated =
				budget.envelopes.find(
					(e) =>
						e.starting === starting && e.currency_uuid === currency_uuid,
				)?.allocated || 0;
			env = {
				budget_uuid: budget.budget_uuid,
				currency_uuid,
				starting,
				allocated,
				used: usages.get(key) || 0,
				remaining: 0,
			};
			envelopes.set(key, env);
		}
		return env;
	};

	// Seed default currency envelopes for all requested months
	for (const starting of seededMonths) {
		for (const budget of budgets) {
			getOrCreate(budget, starting, defaultCurrency);
		}
	}

	// Create envelopes for all keys that have usage
	for (const [key, usage] of usages) {
		// Parse key to find the budget
		const parts = key.split("_");
		// key format: "YYYY-MM-DD_budget_uuid_currency_uuid"
		// starting is "YYYY-MM-DD", budget_uuid and currency_uuid follow
		const starting = parts[0];
		const currency_uuid = parts[parts.length - 1];
		const budget_uuid = parts.slice(1, -1).join("_");
		const budget = budgets.find((b) => b.budget_uuid === budget_uuid);
		if (budget) {
			const env = getOrCreate(budget, starting, currency_uuid);
			env.used = usage;
		}
	}

	// 4. Fill-forward multi-currency: ensure every budget has one envelope
	//    per currency per month across all its seeded months
	const startingsByBudget = new Map<TBudgetUUID, Set<TDate>>();
	for (const env of envelopes.values()) {
		let set = startingsByBudget.get(env.budget_uuid);
		if (!set) {
			set = new Set<TDate>();
			startingsByBudget.set(env.budget_uuid, set);
		}
		set.add(env.starting);
	}

	for (const budget of budgets) {
		const currencies = currenciesByBudget.get(budget.budget_uuid);
		const startings = startingsByBudget.get(budget.budget_uuid);
		if (!currencies || !startings) continue;
		for (const starting of startings) {
			for (const currency_uuid of currencies) {
				getOrCreate(budget, starting, currency_uuid);
			}
		}
	}

	// 5. Forward-pass remaining calculation
	// Group envelopes by (budget_uuid, currency_uuid), sort by month
	const groups = new Map<string, EnvelopeData[]>();
	for (const env of envelopes.values()) {
		const groupKey = `${env.budget_uuid}_${env.currency_uuid}`;
		let group = groups.get(groupKey);
		if (!group) {
			group = [];
			groups.set(groupKey, group);
		}
		group.push(env);
	}

	for (const group of groups.values()) {
		group.sort((a, b) => a.starting.localeCompare(b.starting));
		let prevRemaining = 0;
		for (const env of group) {
			env.remaining = prevRemaining + env.allocated - env.used;
			prevRemaining = env.remaining;
		}
	}

	return envelopes;
}

/**
 * Virtual (non-persisted) month view of a budget. Plain object (no MobX
 * observables) so it can be freely created/updated inside computed
 * derivations.  Reactivity comes from the store's `envelopeData` computed;
 * `budget`/`name` are regular getters that read the live store.
 */
export class BudgetEnvelope implements IBaseEntity {
	[k: string]: unknown;

	entity_type: EntityType = EntityType.VIRTUAL_BUDGET_ENVELOPE;

	_rev: string;

	tags = [];

	envelope_uuid: string;

	budget_uuid: TBudgetUUID;

	currency_uuid: TCurrencyUUID;

	starting: TDate;

	allocated: TMonetary;

	remaining: TMonetary;

	used: TMonetary;

	moneeeyStore: MoneeeyStore;

	constructor(
		moneeeyStore: MoneeeyStore,
		data: EnvelopeData,
		rev: string,
	) {
		this.moneeeyStore = moneeeyStore;
		this.budget_uuid = data.budget_uuid;
		this.currency_uuid = data.currency_uuid;
		this.envelope_uuid = BudgetEnvelopeKey(
			data.budget_uuid,
			data.starting,
			data.currency_uuid,
		);
		this.starting = data.starting;
		this.allocated = data.allocated;
		this.remaining = data.remaining;
		this.used = data.used;
		this._rev = rev;
	}

	updateFrom(data: EnvelopeData, rev: string) {
		this.allocated = data.allocated;
		this.used = data.used;
		this.remaining = data.remaining;
		this._rev = rev;
	}

	get budget(): IBudget | undefined {
		return this.moneeeyStore.budget.byUuid(this.budget_uuid);
	}

	get name(): string {
		return this.budget?.name ?? "";
	}
}

export class BudgetEnvelopeStore extends MappedStore<BudgetEnvelope> {
	seededMonths = observable.set<TDate>();

	private envelopeCache = new Map<string, BudgetEnvelope>();
	private revCounter = 0;

	constructor(moneeeyStore: MoneeeyStore) {
		super(moneeeyStore, {
			getUuid: (b) => b.envelope_uuid,
			factory: () =>
				({
					entity_type: EntityType.VIRTUAL_BUDGET_ENVELOPE,
				}) as BudgetEnvelope,
		});

		makeObservable(this, {
			seedMonth: action,
			envelopeData: computed({ keepAlive: true }),
		});
	}

	seedMonth(starting: TDate) {
		this.seededMonths.add(starting);
	}

	/** Pure computed derivation of all envelope data. */
	get envelopeData(): Map<string, EnvelopeData> {
		return computeEnvelopes(
			this.moneeeyStore.budget.all,
			this.moneeeyStore.transactions.all,
			this.moneeeyStore.accounts,
			this.moneeeyStore.config.main.default_currency,
			this.seededMonths,
		);
	}

	private nextRev(): string {
		return `${++this.revCounter}`;
	}

	/** Sync the wrapper cache with computed data, reusing instances where possible. */
	private syncWrappers(): void {
		const data = this.envelopeData;
		const rev = this.nextRev();
		const staleKeys = new Set(this.envelopeCache.keys());

		for (const [key, envData] of data) {
			staleKeys.delete(key);
			const existing = this.envelopeCache.get(key);
			if (existing) {
				existing.updateFrom(envData, rev);
			} else {
				this.envelopeCache.set(
					key,
					new BudgetEnvelope(this.moneeeyStore, envData, rev),
				);
			}
		}

		for (const key of staleKeys) {
			this.envelopeCache.delete(key);
		}
	}

	override get all(): BudgetEnvelope[] {
		this.syncWrappers();
		return Array.from(this.envelopeCache.values());
	}

	override get ids(): string[] {
		return Array.from(this.envelopeData.keys());
	}

	override byUuid(uuid: string | undefined): BudgetEnvelope | undefined {
		if (!uuid) return undefined;
		this.syncWrappers();
		return this.envelopeCache.get(uuid);
	}

	override hasKey(uuid: string | undefined): boolean {
		if (!uuid) return false;
		return this.envelopeData.has(uuid);
	}

	merge(item: BudgetEnvelope, _options?: { setUpdated: boolean }): void {
		// Write allocation back to parent Budget — this triggers
		// envelopeData recomputation via MobX dependency on budget.all.
		const parentBudget =
			this.moneeeyStore.budget.byUuid(item.budget_uuid);
		if (parentBudget) {
			this.moneeeyStore.budget.setAllocation(
				parentBudget,
				item.starting,
				item.currency_uuid,
				item.allocated,
			);
		}
	}
}
