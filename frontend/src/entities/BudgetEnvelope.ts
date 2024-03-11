import { debounce, values } from "lodash";
import { action, makeObservable, observable } from "mobx";

import { EntityType, IBaseEntity, TMonetary } from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import MoneeeyStore from "../shared/MoneeeyStore";
import {
	TDate,
	formatDate,
	parseDate,
	startOfMonthOffset,
} from "../utils/Date";
import { asyncProcess } from "../utils/Utils";

import { IBudget } from "./Budget";

const BudgetEnvelopeKey = (budget: IBudget, starting: TDate) =>
	`${starting}_${budget.budget_uuid}_${budget.currency_uuid}`;

export class BudgetEnvelope implements IBaseEntity {
	[k: string]: unknown;

	entity_type: EntityType = EntityType.VIRTUAL_BUDGET_ENVELOPE;

	_rev: string;

	tags = [];

	name: string;

	envelope_uuid: string;

	starting: TDate;

	allocated: TMonetary;

	remaining: TMonetary;

	used: TMonetary;

	budget: IBudget;

	constructor(budget: IBudget, starting: TDate, allocated: number) {
		makeObservable(this, {
			allocated: observable,
			remaining: observable,
			used: observable,
		});

		this.budget = budget;
		this.envelope_uuid = BudgetEnvelopeKey(budget, starting);
		this.starting = starting;
		this.allocated = allocated;
		this.remaining = 0;
		this.used = 0;
		this.name = budget.name;
		this._rev = this.budget._rev || "";
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

		makeObservable(this, {
			updateVirtualEnvelopeUsage: action,
			updateVirtualEnvelopeRemainings: action,
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
		const envelope = new BudgetEnvelope(entity, starting, allocated);
		super.merge(envelope);

		return envelope;
	}

	merge(item: BudgetEnvelope, options?: { setUpdated: boolean }): void {
		this.moneeeyStore.budget.setAllocation(
			item.budget,
			item.starting,
			item.allocated,
		);
		this.updateRemainings();
		super.merge(item, options);
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

		const previousEnvelope =
			hasPreviousTransaction &&
			this.getEnvelope(envelope.budget, formatDate(previousEnvelopeStarting));

		const previousValue = previousEnvelope
			? this.getRemaining(previousEnvelope)
			: 0;

		return envelope.allocated - envelope.used + previousValue;
	}

	updateVirtualEnvelopeUsage(envelope: BudgetEnvelope, usage: number) {
		envelope.used = usage;
	}

	updateVirtualEnvelopeRemainings() {
		this.all.forEach((envelope) => {
			envelope.remaining = this.getRemaining(envelope);
		});
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
					chunk.forEach((transaction) => {
						const starting = formatDate(
							startOfMonthOffset(parseDate(transaction.date), 0),
						);
						const allTransactionTags = transactions.getAllTransactionTags(
							transaction,
							accounts,
						);
						const budgets =
							this.moneeeyStore.budget.findBudgetsFor(allTransactionTags);
						budgets.forEach((budget) => {
							const envelope = this.getEnvelope(budget, starting);
							state[envelope.envelope_uuid] = {
								envelope,
								usage:
									(state[envelope.envelope_uuid]?.usage || 0) +
									transaction.from_value,
							};
						});
					});
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
			values(usages).map(({ envelope, usage }) =>
				this.updateVirtualEnvelopeUsage(envelope, usage),
			);
			this.updateRemainings();
		},
		500,
	);
}
