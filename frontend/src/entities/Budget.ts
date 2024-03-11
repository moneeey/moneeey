import _ from "lodash";
import { action, makeObservable } from "mobx";

import { EntityType, type IBaseEntity, type TMonetary } from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import type MoneeeyStore from "../shared/MoneeeyStore";
import { type TDate, currentDateTime } from "../utils/Date";
import { uuid } from "../utils/Utils";

import { BudgetEnvelopeStore } from "./BudgetEnvelope";
import type { TCurrencyUUID } from "./Currency";

export type TBudgetUUID = string;

interface IBudgetEnvelope {
	starting: TDate;
	allocated: TMonetary;
}

export interface IBudget extends IBaseEntity {
	budget_uuid: TBudgetUUID;
	currency_uuid: TCurrencyUUID;
	name: string;
	archived: boolean;
	envelopes: IBudgetEnvelope[];
}

export class BudgetStore extends MappedStore<IBudget> {
	private _envelopes: BudgetEnvelopeStore;

	constructor(moneeeyStore: MoneeeyStore) {
		super(moneeeyStore, {
			getUuid: (a: IBudget) => a.budget_uuid,

			factory: (id?: string) => ({
				entity_type: EntityType.BUDGET,
				name: "",
				currency_uuid: "",
				budget_uuid: id || uuid(),
				tags: [],
				envelopes: [],
				created: currentDateTime(),
				updated: currentDateTime(),
				archived: false,
			}),
		});

		this._envelopes = new BudgetEnvelopeStore(moneeeyStore);

		makeObservable(this, {
			setAllocation: action,
		});
	}

	get envelopes() {
		return this._envelopes;
	}

	getRealEnvelope(entity: IBudget, starting: TDate) {
		const existing = entity.envelopes.find(
			(envelope) => envelope.starting === starting,
		);
		if (existing) {
			return existing;
		}
		const envelope = { starting, allocated: 0 };
		entity.envelopes.push(envelope);

		return envelope;
	}

	setAllocation(entity: IBudget, starting: TDate, allocated: number) {
		const latest = this.byUuid(entity.budget_uuid);
		if (latest) {
			const realEnvelope = this.getRealEnvelope(latest, starting);
			if (realEnvelope.allocated !== allocated) {
				this.merge({
					...latest,
					envelopes: [
						...latest.envelopes.filter(
							(envelope) => envelope.starting !== starting,
						),
						{ starting, allocated },
					],
				});
			}
		}
	}

	makeEnvelopes(starting: TDate, onProgress: (percentage: number) => void) {
		for (const budget of this.all) {
			this.envelopes.getEnvelope(budget, starting);
		}
		this.envelopes.calculateRemaining(onProgress);
	}

	findBudgetsFor(tags: string[]) {
		return this.all.filter((budget) => {
			return _.some(budget.tags, (budgetTag) => _.includes(tags, budgetTag));
		});
	}
}

export default BudgetStore;
