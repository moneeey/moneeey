import { currentDateTime, TDate } from '../utils/Date'
import { EntityType, IBaseEntity, TMonetary } from '../shared/Entity'
import MappedStore from '../shared/MappedStore'
import { uuid } from '../utils/Utils'
import MoneeeyStore from '../shared/MoneeeyStore'
import { TCurrencyUUID } from './Currency'
import { EditorType } from '../components/editor/EditorProps'
import { makeObservable, observable } from 'mobx'

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
  tags = []
  name: string
  envelope_uuid: string
  starting: TDate
  allocated: TMonetary
  remaining: TMonetary
  budget: IBudget

  constructor(budget: IBudget, starting: TDate) {
    makeObservable(this, {
      allocated: observable,
      remaining: observable,
    })

    this.budget = budget
    this.envelope_uuid = BudgetEnvelopeKey(budget, starting)
    this.starting = starting
    this.allocated = 0
    this.remaining = 0
    this.name = budget.name
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
          editor: EditorType.LABEL,
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
        remaining: {
          editor: EditorType.BUDGET_REMAINING,
          field: 'remaining',
          index: 2,
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

    const realEnvelope = this.getRealEnvelope(entity, starting)
    realEnvelope.allocated = allocated
    this.merge(entity)
  }

  makeEnvelopes(starting: TDate) {
    this.all.forEach((budget) => this.getEnvelope(budget, starting))
  }
}

export default BudgetStore
