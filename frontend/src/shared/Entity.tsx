import { v4 as uuidv4 } from 'uuid'

import { TDateTime } from '../utils/Date'

export const generateUuid = () => uuidv4()
export type TMonetary = number;

export const randomRange = (minn: number, maxx: number) => Math.random() * (maxx - minn) + minn

export enum EntityType {
  ACCOUNT = 'ACCOUNT',
  TRANSACTION = 'TRANSACTION',
  BUDGET = 'BUDGET',
  CURRENCY = 'CURRENCY'
}

export interface IBaseCouchEntity {
  _id?: string;
  _rev?: string;
  _deleted?: boolean;
}

export interface IBaseEntity extends IBaseCouchEntity {
  entity_type: EntityType;
  tags: string[];
  updated?: TDateTime;
  created?: TDateTime;
}

export function isEntityType<TEntityType>(entity_type: EntityType) {
  return function(object: { entity_type?: EntityType }): object is TEntityType {
    return object?.entity_type === entity_type
  }
}