import {
  currentDateTime,
  formatDate,
  parseDate,
  startOfMonthOffset,
  TDate,
} from '../utils/Date'
import { EntityType, IBaseEntity, TMonetary } from '../shared/Entity'
import MappedStore from '../shared/MappedStore'
import { asyncProcess, uuid } from '../utils/Utils'
import MoneeeyStore from '../shared/MoneeeyStore'
import { TCurrencyUUID } from './Currency'
import _, { debounce, values } from 'lodash'
import { BudgetEnvelope, BudgetEnvelopeStore } from './BudgetEnvelope'

export type TBudgetUUID = string

interface IBudgetEnvelope {
  starting: TDate
  allocated: TMonetary
}

export interface IBudget extends IBaseEntity {
  budget_uuid: TBudgetUUID
  currency_uuid: TCurrencyUUID
  name: string
  archived: boolean
  envelopes: IBudgetEnvelope[]
}

export class BudgetStore extends MappedStore<IBudget> {
  private _envelopes: BudgetEnvelopeStore

  constructor(moneeeyStore: MoneeeyStore) {
    super(
      moneeeyStore,
      (a: IBudget) => a.budget_uuid,
      (id?: string) => ({
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
      () => ({})
    )

    this._envelopes = new BudgetEnvelopeStore(moneeeyStore)
  }

  get envelopes() {
    return this._envelopes
  }

  getRealEnvelope(entity: IBudget, starting: TDate) {
    const existing = entity.envelopes.find(
      (envelope) => (envelope.starting = starting)
    )
    if (existing) {
      return existing
    } else {
      const envelope = { starting, allocated: 0 }
      entity.envelopes.push(envelope)
      return envelope
    }
  }

  getEnvelope(entity: IBudget, starting: TDate) {
    return this.envelopes.getEnvelope(entity, starting)
  }

  setAllocation(entity: IBudget, starting: TDate, allocated: number) {
    const envelope = this.envelopes.getEnvelope(entity, starting)
    envelope.allocated = allocated
    this.envelopes.merge(envelope)

    const realEnvelope = this.getRealEnvelope(entity, starting)
    realEnvelope.allocated = allocated
    this.merge(entity)
  }

  makeEnvelopes(starting: TDate) {
    this.all.forEach((budget) => this.getEnvelope(budget, starting))
    this.calculateRemaining()
  }

  findBudgetsFor(tags: string[]) {
    return this.all.filter((budget) => {
      return _.every(budget.tags, (tag) => _.includes(tags, tag))
    })
  }

  getRemaining(envelope: BudgetEnvelope): number {
    const previousEnvelopeStarting = startOfMonthOffset(
      parseDate(envelope.starting),
      -1
    )

    const hasPreviousTransaction =
      this.moneeeyStore.transactions.oldest_dt.getTime() <
      previousEnvelopeStarting.getTime()

    const previousEnvelope = hasPreviousTransaction
      ? this.getEnvelope(envelope.budget, formatDate(previousEnvelopeStarting))
      : null

    const previousValue = previousEnvelope
      ? this.getRemaining(previousEnvelope)
      : 0

    return envelope.allocated - envelope.used + previousValue
  }

  calculateRemaining = debounce(async () => {
    const { transactions, accounts } = this.moneeeyStore
    console.time('Budget.calculateRemaining')
    const usage = await asyncProcess(
      transactions.all.filter(
        (t) =>
          !accounts.isOffBudget(t.from_account) &&
          !accounts.isOffBudget(t.to_account)
      ),
      (chunk, state) =>
        chunk.forEach((transaction) => {
          const starting = formatDate(
            startOfMonthOffset(parseDate(transaction.date), 0)
          )
          const budgets = this.findBudgetsFor(
            transactions.getAllTransactionTags(transaction, accounts)
          )
          budgets.forEach((budget) => {
            const envelope = this.getEnvelope(budget, starting)
            state[envelope.envelope_uuid] = {
              envelope,
              usage:
                (state[envelope.envelope_uuid]?.usage || 0) -
                transaction.from_value,
            }
          })
        }),
      {} as Record<string, { usage: number; envelope: BudgetEnvelope }>,
      100,
      50
    )
    console.timeEnd('Budget.calculateRemaining')
    console.log('Budget.calculateRemaining', { usage })
    values(usage).map(({ envelope, usage }) => (envelope.used = usage))
  }, 500)
}

export default BudgetStore
