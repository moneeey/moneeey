import { v4 as uuidv4 } from "uuid";

export const generateUuid = () => uuidv4();

export type TMonetary = number;
export type TDate = string;

export enum EntityType {
  ACCOUNT = "ACCOUNT",
  TRANSACTION = "TRANSACTION",
  BUDGET = "BUDGET",
  CURRENCY = "CURRENCY",
}

export interface IBaseEntity {
  entity_type: EntityType;
  tags: string[];
}
