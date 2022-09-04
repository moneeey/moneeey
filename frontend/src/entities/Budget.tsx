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
import { EditorType } from '../components/editor/EditorProps'
import { makeObservable, observable } from 'mobx'
import _, { debounce, values } from 'lodash'

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

const BudgetEnvelopeKey = (budget: IBudget, starting: TDate) =>
  `${starting}_${budget.budget_uuid}_${budget.currency_uuid}`

export class BudgetEnvelope implements IBaseEntity {
  entity_type: EntityType = EntityType.VIRTUAL_BUDGET_ENVELOPE
  _rev: string
  tags = []
  name: string
  envelope_uuid: string
  starting: TDate
  allocated: TMonetary
  used: TMonetary
  budget: IBudget

  constructor(budget: IBudget, starting: TDate) {
    makeObservable(this, {
      allocated: observable,
      used: observable,
    })

    this.budget = budget
    this.envelope_uuid = BudgetEnvelopeKey(budget, starting)
    this.starting = starting
    this.allocated = 0
    this.used = 0
    this.name = budget.name
    this._rev = this.budget._rev || ''
  }
}

export class BudgetEnvelopeStore extends MappedStore<BudgetEnvelope> {
  constructor(moneeeyStore: MoneeeyStore) {
    super(
      moneeeyStore,
      (b) => b.envelope_uuid,
      () => ({} as unknown as BudgetEnvelope),
      () => ({
        name: {
          editor: EditorType.LINK,
          field: 'name',
          index: 0,
          title: 'Budget',
        },
        allocated: {
          editor: EditorType.BUDGET_ALLOCATED,
          field: 'allocated',
          index: 1,
          title: 'Allocated',
        },
        used: {
          editor: EditorType.BUDGET_USED,
          field: 'used',
          index: 2,
          title: 'Used',
        },
        remaining: {
          editor: EditorType.BUDGET_REMAINING,
          field: 'remaining',
          index: 3,
          title: 'Remaining',
        },
      })
    )
  }

  getEnvelope(entity: IBudget, starting: TDate) {
    const key = BudgetEnvelopeKey(entity, starting)
    if (this.hasKey(key)) {
      return this.byUuid(key) as BudgetEnvelope
    }
    const envelope = new BudgetEnvelope(entity, starting)
    envelope.allocated =
      entity.envelopes.find((envelop) => envelop.starting === starting)
        ?.allocated || 0
    this.merge(envelope)
    return envelope
  }
}

export class BudgetStore extends MappedStore<IBudget> {
  private _envelopes: BudgetEnvelopeStore

  constructor(moneeeyStore: MoneeeyStore) {
    super(
      moneeeyStore,
      (a: IBudget) => a.budget_uuid,
      () => ({
        entity_type: EntityType.BUDGET,
        name: '',
        currency_uuid: '',
        budget_uuid: uuid(),
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

  calculateRemaining = debounce(async () => {
    const { transactions, accounts } = this.moneeeyStore
    console.time('Budget.calculateRemaining')
    const usage = await asyncProcess(
      transactions.all,
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
                (state[envelope.envelope_uuid]?.usage || 0) +
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
