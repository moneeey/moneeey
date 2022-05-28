import { v4 as uuidv4 } from 'uuid';
import { TDateTime } from './Date';

export const generateUuid = () => uuidv4();
export type TMonetary = number;

export const randomRange = (minn: number, maxx: number) => Math.random() * (maxx - minn) + minn;

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
