import _, { debounce, values } from 'lodash';
import { action, makeObservable } from 'mobx';

import { TDate, currentDateTime, formatDate, parseDate, startOfMonthOffset } from '../utils/Date';
import { EntityType, IBaseEntity, TMonetary } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';
import { asyncProcess, uuid } from '../utils/Utils';
import MoneeeyStore from '../shared/MoneeeyStore';

import { TCurrencyUUID } from './Currency';
import { BudgetEnvelope, BudgetEnvelopeStore } from './BudgetEnvelope';

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
        name: '',
        currency_uuid: '',
        budget_uuid: id || uuid(),
        tags: [],
        envelopes: [],
        created: currentDateTime(),
        updated: currentDateTime(),
        archived: false,
      }),
      schema: () => ({}),
    });

    this._envelopes = new BudgetEnvelopeStore(moneeeyStore);

    makeObservable(this, {
      setRemaining: action,
      setAllocation: action,
    });
  }

  get envelopes() {
    return this._envelopes;
  }

  getRealEnvelope(entity: IBudget, starting: TDate) {
    const existing = entity.envelopes.find((envelope) => (envelope.starting = starting));
    if (existing) {
      return existing;
    }
    const envelope = { starting, allocated: 0 };
    entity.envelopes.push(envelope);

    return envelope;
  }

  getEnvelope(entity: IBudget, starting: TDate) {
    return this.envelopes.getEnvelope(entity, starting);
  }

  setAllocation(entity: IBudget, starting: TDate, allocated: number) {
    const envelope = this.envelopes.getEnvelope(entity, starting);
    envelope.allocated = allocated;
    this.envelopes.merge(envelope);

    const realEnvelope = this.getRealEnvelope(entity, starting);
    realEnvelope.allocated = allocated;
    this.merge(entity);
  }

  makeEnvelopes(starting: TDate, onProgress: (percentage: number) => void) {
    this.all.forEach((budget) => this.getEnvelope(budget, starting));
    this.calculateRemaining(onProgress);
  }

  findBudgetsFor(tags: string[]) {
    return this.all.filter((budget) => {
      return _.some(budget.tags, (budgetTag) => _.includes(tags, budgetTag));
    });
  }

  getRemaining(envelope: BudgetEnvelope): number {
    const previousEnvelopeStarting = startOfMonthOffset(parseDate(envelope.starting), -1);

    const hasPreviousTransaction =
      this.moneeeyStore.transactions.oldest_dt.getTime() < previousEnvelopeStarting.getTime();

    const previousEnvelope =
      hasPreviousTransaction && this.getEnvelope(envelope.budget, formatDate(previousEnvelopeStarting));

    const previousValue = previousEnvelope ? this.getRemaining(previousEnvelope) : 0;

    return envelope.allocated - envelope.used + previousValue;
  }

  setRemaining(envelope: BudgetEnvelope, usage: number) {
    envelope.used = usage;
  }

  calculateRemaining = debounce(async (onProgress: (percentage: number) => void) => {
    const { transactions, accounts } = this.moneeeyStore;
    onProgress(0);
    const usages = await asyncProcess(
      transactions.all.filter((t) => !accounts.isOffBudget(t.from_account) && !accounts.isOffBudget(t.to_account)),
      (chunk, state, percentage) => {
        onProgress(percentage);
        chunk.forEach((transaction) => {
          const starting = formatDate(startOfMonthOffset(parseDate(transaction.date), 0));
          const allTransactionTags = transactions.getAllTransactionTags(transaction, accounts);
          const budgets = this.findBudgetsFor(allTransactionTags);
          budgets.forEach((budget) => {
            const envelope = this.getEnvelope(budget, starting);
            state[envelope.envelope_uuid] = {
              envelope,
              usage: (state[envelope.envelope_uuid]?.usage || 0) - transaction.from_value,
            };
          });
        });
      },
      { state: {} as Record<string, { usage: number; envelope: BudgetEnvelope }>, chunkSize: 100, chunkThrottle: 50 }
    );
    values(usages).map(({ envelope, usage }) => this.setRemaining(envelope, usage));
  }, 500);
}

export default BudgetStore;
