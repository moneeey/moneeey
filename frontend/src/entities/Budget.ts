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
	currency_uuid: TCurrencyUUID;
	allocated: TMonetary;
}

export interface IBudget extends IBaseEntity {
	budget_uuid: TBudgetUUID;
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

	getRealEnvelope(
		entity: IBudget,
		starting: TDate,
		currency_uuid: TCurrencyUUID,
	) {
		const existing = entity.envelopes.find(
			(envelope) =>
				envelope.starting === starting &&
				envelope.currency_uuid === currency_uuid,
		);
		if (existing) {
			return existing;
		}
		const envelope = { starting, currency_uuid, allocated: 0 };
		entity.envelopes.push(envelope);

		return envelope;
	}

	setAllocation(
		entity: IBudget,
		starting: TDate,
		currency_uuid: TCurrencyUUID,
		allocated: number,
	) {
		const latest = this.byUuid(entity.budget_uuid);
		if (latest) {
			const realEnvelope = this.getRealEnvelope(
				latest,
				starting,
				currency_uuid,
			);
			if (realEnvelope.allocated !== allocated) {
				this.merge({
					...latest,
					envelopes: [
						...latest.envelopes.filter(
							(envelope) =>
								envelope.starting !== starting ||
								envelope.currency_uuid !== currency_uuid,
						),
						{ starting, currency_uuid, allocated },
					],
				});
			}
		}
	}

	seedEnvelopes(starting: TDate) {
		this.envelopes.seedMonth(starting);
	}
}

export default BudgetStore;
