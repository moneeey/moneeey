import { makeObservable, observable } from 'mobx'

import { EditorType } from '../components/editor/EditorProps'
import { EntityType, IBaseEntity, TMonetary } from '../shared/Entity'
import MappedStore from '../shared/MappedStore'
import MoneeeyStore from '../shared/MoneeeyStore'
import { TDate } from '../utils/Date'

import { IBudget } from './Budget'

const BudgetEnvelopeKey = (budget: IBudget, starting: TDate) =>
  `${starting}_${budget.budget_uuid}_${budget.currency_uuid}`

export class BudgetEnvelope implements IBaseEntity {
  [k: string]: unknown

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
    super(moneeeyStore, {
      getUuid: (b) => b.envelope_uuid,
      factory: () => {
        throw new Error('This factory should never been used!')
      },
      schema: () => ({
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
      }),
    })
  }

  getEnvelope(entity: IBudget, starting: TDate) {
    const key = BudgetEnvelopeKey(entity, starting)
    if (this.hasKey(key)) {
      return this.byUuid(key) as BudgetEnvelope
    }
    const envelope = new BudgetEnvelope(entity, starting)
    envelope.allocated = entity.envelopes.find((envelop) => envelop.starting === starting)?.allocated || 0
    this.merge(envelope)

    return envelope
  }
}
