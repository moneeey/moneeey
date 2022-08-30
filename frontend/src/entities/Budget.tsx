import { currentDateTime, TDate } from '../utils/Date'
import { EntityType, IBaseEntity, TMonetary } from '../shared/Entity'
import MappedStore from '../shared/MappedStore'
import { uuid } from '../utils/Utils'
import MoneeeyStore from '../shared/MoneeeyStore'
import { TCurrencyUUID } from './Currency'

export type TBudgetUUID = string

interface IBudgetEnvelope {
  starting: TDate
  ending: TDate
  allocated: TMonetary
}

export interface IBudget extends IBaseEntity {
  budget_uuid: TBudgetUUID
  currency_uuid: TCurrencyUUID
  name: string
  envelopes: IBudgetEnvelope[]
}

export class BudgetStore extends MappedStore<IBudget> {
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
      }),
      () => ({})
    )
  }
}

export default BudgetStore
