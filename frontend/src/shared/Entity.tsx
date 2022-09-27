import { TDateTime } from '../utils/Date'

export type TMonetary = number

export enum EntityType {
  ACCOUNT = 'ACCOUNT',
  TRANSACTION = 'TRANSACTION',
  BUDGET = 'BUDGET',
  CURRENCY = 'CURRENCY',
  CONFIG = 'CONFIG',
  VIRTUAL_BUDGET_ENVELOPE = 'VIRTUAL_BUDGET_ENVELOPE',
}

export interface IBaseCouchEntity {
  _id?: string
  _rev?: string
  _deleted?: boolean
}

export interface IBaseEntity extends IBaseCouchEntity {
  [k: string]: unknown
  entity_type: EntityType
  tags: string[]
  updated?: TDateTime
  created?: TDateTime
}

const isEntityType = function <TEntityType extends { entity_type?: EntityType | undefined }>(entity_type: EntityType) {
  return function (object: { entity_type?: EntityType }): object is TEntityType {
    return object?.entity_type === entity_type
  }
}

export { isEntityType }
