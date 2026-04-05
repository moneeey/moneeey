import { debounce, values } from "lodash";
import { action, computed, makeObservable, observable, reaction } from "mobx";

import { EntityType, type IBaseEntity, type TMonetary } from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import type MoneeeyStore from "../shared/MoneeeyStore";
import {
	type TDate,
	formatDate,
	parseDate,
	startOfMonthOffset,
} from "../utils/Date";
import { asyncProcess } from "../utils/Utils";

import type { IBudget, TBudgetUUID } from "./Budget";
import type { TCurrencyUUID } from "./Currency";

const BudgetEnvelopeKey = (
	budget: IBudget,
	starting: TDate,
	currency_uuid: TCurrencyUUID,
) => `${starting}_${budget.budget_uuid}_${currency_uuid}`;

/**
 * Virtual (non-persisted) month view of a budget. `budget`/`name` are
 * computed so rename/archive on the parent is reflected live.
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
		budget: IBudget,
		starting: TDate,
		currency_uuid: TCurrencyUUID,
		allocated: number,
	) {
		makeObservable(this, {
			allocated: observable,
			remaining: observable,
			used: observable,
			budget: computed,
			name: computed,
		});

		this.moneeeyStore = moneeeyStore;
		this.budget_uuid = budget.budget_uuid;
		this.currency_uuid = currency_uuid;
		this.envelope_uuid = BudgetEnvelopeKey(budget, starting, currency_uuid);
		this.starting = starting;
		this.allocated = allocated;
		this.remaining = 0;
		this.used = 0;
		this._rev = budget._rev || "";
	}

	get budget(): IBudget | undefined {
		return this.moneeeyStore.budget.byUuid(this.budget_uuid);
	}

	get name(): string {
		return this.budget?.name ?? "";
	}
}

export class BudgetEnvelopeStore extends MappedStore<BudgetEnvelope> {
	private reactionDisposer?: () => void;

	constructor(moneeeyStore: MoneeeyStore) {
		super(moneeeyStore, {
			getUuid: (b) => b.envelope_uuid,
			factory: () =>
				({
					entity_type: EntityType.VIRTUAL_BUDGET_ENVELOPE,
				}) as BudgetEnvelope,
		});

		makeObservable(this, {
			getEnvelope: action,
			updateVirtualEnvelopeUsage: action,
			updateVirtualEnvelopeRemainings: action,
		});
	}

	/** Recompute usage whenever any budget's tag set changes. */
	onStoresReady(): void {
		this.reactionDisposer?.();
		this.reactionDisposer = reaction(
			() =>
				this.moneeeyStore.budget.all
					.map(
						(b) => `${b.budget_uuid}:${[...(b.tags || [])].sort().join(",")}`,
					)
					.sort()
					.join("|"),
			() => {
				this.calculateRemaining(() => {});
			},
		);
	}

	getEnvelope(
		entity: IBudget,
		starting: TDate,
		currency_uuid: TCurrencyUUID,
	) {
		const key = BudgetEnvelopeKey(entity, starting, currency_uuid);
		if (this.hasKey(key)) {
			return this.byUuid(key) as BudgetEnvelope;
		}
		const allocated =
			entity.envelopes.find(
				(envelop) =>
					envelop.starting === starting &&
					envelop.currency_uuid === currency_uuid,
			)?.allocated || 0;
		const envelope = new BudgetEnvelope(
			this.moneeeyStore,
			entity,
			starting,
			currency_uuid,
			allocated,
		);
		this.itemsByUuid.set(key, envelope);

		return envelope;
	}

	merge(item: BudgetEnvelope, _options?: { setUpdated: boolean }): void {
		// `item` may be a plain object from `{...entity, ...delta()}` — object
		// spread drops our prototype getters, so resolve to the existing class
		// instance and mutate its fields in place. Envelopes are virtual and
		// deliberately bypass `super.merge`.
		const uuid = this.getUuid(item);
		const existing = this.byUuid(uuid) as BudgetEnvelope | undefined;
		const target = existing ?? item;
		if (existing) {
			existing.allocated = item.allocated;
			existing.used = item.used;
			existing.remaining = item.remaining;
			existing._rev = item._rev;
		}

		const parentBudget = target.budget;
		if (parentBudget) {
			this.moneeeyStore.budget.setAllocation(
				parentBudget,
				target.starting,
				target.currency_uuid,
				target.allocated,
			);
		}
		this.updateRemainings();
		this.itemsByUuid.set(uuid, target);
	}

	getRemaining(envelope: BudgetEnvelope): number {
		const previousEnvelopeStarting = startOfMonthOffset(
			parseDate(envelope.starting),
			-1,
		);

		const hasPreviousTransaction =
			startOfMonthOffset(
				this.moneeeyStore.transactions.oldest_dt,
				-1,
			).getTime() < previousEnvelopeStarting.getTime();

		const parentBudget = envelope.budget;
		const previousEnvelope =
			hasPreviousTransaction && parentBudget
				? this.getEnvelope(
						parentBudget,
						formatDate(previousEnvelopeStarting),
						envelope.currency_uuid,
					)
				: undefined;

		const previousValue = previousEnvelope
			? this.getRemaining(previousEnvelope)
			: 0;

		return envelope.allocated - envelope.used + previousValue;
	}

	currentEnvelopeRev = 0;
	nextEnvelopeRev() {
		return `${++this.currentEnvelopeRev}`;
	}

	updateVirtualEnvelopeUsage(envelope: BudgetEnvelope, usage: number) {
		envelope.used = usage;
		envelope._rev = this.nextEnvelopeRev();
		this.itemsByUuid.set(this.getUuid(envelope), envelope);
	}

	updateVirtualEnvelopeRemainings() {
		for (const envelope of this.all) {
			envelope.remaining = this.getRemaining(envelope);
			envelope._rev = this.nextEnvelopeRev();
			this.itemsByUuid.set(this.getUuid(envelope), envelope);
		}
	}

	updateRemainings = debounce(() => {
		this.updateVirtualEnvelopeRemainings();
	}, 500);

	calculateRemaining = debounce(
		async (onProgress: (percentage: number) => void) => {
			const { transactions, accounts } = this.moneeeyStore;
			onProgress(0);
			const usages = await asyncProcess(
				transactions.all.filter(
					(t) =>
						!accounts.isOffBudget(t.from_account) &&
						!accounts.isOffBudget(t.to_account),
				),
				(chunk, state, percentage) => {
					onProgress(percentage);
					for (const transaction of chunk) {
						const starting = formatDate(
							startOfMonthOffset(parseDate(transaction.date), 0),
						);
						const allTransactionTags = transactions.getAllTransactionTags(
							transaction,
							accounts,
						);
						const budgets =
							this.moneeeyStore.budget.findBudgetsFor(allTransactionTags);
						// Group usage by the transaction's own currency so a single
						// budget with multi-currency matches produces one envelope row
						// per currency.
						const fromAccount = accounts.byUuid(transaction.from_account);
						const tx_currency_uuid =
							fromAccount?.currency_uuid ||
							this.moneeeyStore.config.main.default_currency;
						for (const budget of budgets) {
							const envelope = this.getEnvelope(
								budget,
								starting,
								tx_currency_uuid,
							);
							state[envelope.envelope_uuid] = {
								envelope,
								usage:
									(state[envelope.envelope_uuid]?.usage || 0) +
									transaction.from_value,
							};
						}
					}
				},
				{
					state: {} as Record<
						string,
						{ usage: number; envelope: BudgetEnvelope }
					>,
					chunkSize: 200,
					chunkThrottle: 20,
				},
			);
			// Zero-out envelopes whose parent budget no longer matches any
			// transaction so tag changes fully recalc instead of going stale.
			const matchedUuids = new Set(Object.keys(usages));
			for (const envelope of this.all) {
				if (!matchedUuids.has(envelope.envelope_uuid)) {
					this.updateVirtualEnvelopeUsage(envelope, 0);
				}
			}
			values(usages).map(({ envelope, usage }) =>
				this.updateVirtualEnvelopeUsage(envelope, usage),
			);
			this.updateRemainings();
		},
		500,
	);
}
