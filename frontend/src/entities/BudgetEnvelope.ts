import { debounce, values } from "lodash";
import {
	action,
	computed,
	makeObservable,
	observable,
	reaction,
} from "mobx";

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

const BudgetEnvelopeKey = (budget: IBudget, starting: TDate) =>
	`${starting}_${budget.budget_uuid}_${budget.currency_uuid}`;

/**
 * Virtual (non-persisted) view of a budget for a specific month.
 *
 * Holds ONLY the identifiers of its parent budget; `budget` and `name` are
 * computed getters that look up the current budget from the store on every
 * read. This guarantees a single source of truth — if the parent budget is
 * renamed, archived, or otherwise updated, every envelope referring to it
 * reflects the change immediately via MobX reactivity.
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
		this.currency_uuid = budget.currency_uuid;
		this.envelope_uuid = BudgetEnvelopeKey(budget, starting);
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
	constructor(moneeeyStore: MoneeeyStore) {
		super(moneeeyStore, {
			getUuid: (b) => b.envelope_uuid,
			factory: () =>
				({
					entity_type: EntityType.VIRTUAL_BUDGET_ENVELOPE,
				}) as BudgetEnvelope,
		});

		// `merge` is already annotated as an action by the parent
		// `MappedStore.makeObservable`; re-annotating here would make MobX
		// throw. Our override is picked up via the prototype chain at the
		// moment the parent's `makeObservable` runs, so it's already wrapped.
		// Every other method that mutates the observable map or envelope
		// fields needs its own action annotation.
		makeObservable(this, {
			getEnvelope: action,
			updateVirtualEnvelopeUsage: action,
			updateVirtualEnvelopeRemainings: action,
		});

		// Whenever the budget set or any budget's tags change, usage must be
		// recomputed from scratch — transactions that used to match a budget
		// may no longer match, and vice versa. We build a stable fingerprint
		// of (budget_uuid, sorted tags) for all budgets; MobX fires the
		// reaction only when it changes.
		//
		// We defer the reaction setup to a microtask because this constructor
		// runs from inside BudgetStore's constructor — at that moment
		// `moneeeyStore.budget` is still undefined (BudgetStore hasn't been
		// assigned to MoneeeyStore yet), and MobX would silently fail to
		// track its observables.
		queueMicrotask(() => {
			reaction(
				() =>
					moneeeyStore.budget.all
						.map(
							(b) =>
								`${b.budget_uuid}:${[...(b.tags || [])].sort().join(",")}`,
						)
						.sort()
						.join("|"),
				() => {
					this.calculateRemaining(() => {});
				},
			);
		});
	}

	getEnvelope(entity: IBudget, starting: TDate) {
		const key = BudgetEnvelopeKey(entity, starting);
		if (this.hasKey(key)) {
			return this.byUuid(key) as BudgetEnvelope;
		}
		const allocated =
			entity.envelopes.find((envelop) => envelop.starting === starting)
				?.allocated || 0;
		const envelope = new BudgetEnvelope(
			this.moneeeyStore,
			entity,
			starting,
			allocated,
		);
		this.itemsByUuid.set(key, envelope);

		return envelope;
	}

	merge(item: BudgetEnvelope, _options?: { setUpdated: boolean }): void {
		// `item` may arrive as a PLAIN OBJECT rather than a BudgetEnvelope
		// instance — the editor commit flow in CurrencyAmountField does
		// `commit({ ...entity, ...delta(...) })`, and object spread only
		// copies own data properties, dropping our `budget` and `name`
		// prototype getters. To preserve the single source of truth, always
		// resolve to the existing class instance in the store and apply the
		// mutable field updates there. Identity (envelope_uuid / budget_uuid
		// / currency_uuid / starting) is immutable for an envelope and
		// intentionally not copied.
		//
		// We deliberately don't call `super.merge` for envelopes — they are
		// VIRTUAL (never persisted) and its object spread would drop the
		// prototype accessors.
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
				? this.getEnvelope(parentBudget, formatDate(previousEnvelopeStarting))
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
						for (const budget of budgets) {
							const envelope = this.getEnvelope(budget, starting);
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
			// Apply the freshly-computed usages. Any envelope NOT in `usages`
			// had no matching transactions this pass (e.g. because its parent
			// budget's tags changed and no longer match anything), so its
			// `used` is reset to zero. This is what makes a tag change cause
			// a full recalculation rather than leaving stale numbers.
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
