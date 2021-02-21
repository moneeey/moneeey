import { format, formatISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";

export const generateUuid = () => uuidv4();
export const currentDate = () => format(new Date(), "yyyy-MM-dd");
export const currentDateTime = () => formatISO(new Date());
export const formatDateAs = (date: TDate, pattern: string) =>
  format(new Date(date), pattern);
export const compareDates = (a: TDate, b: TDate) =>
  new Date(a).getTime() - new Date(b).getTime();

export type TMonetary = number;
export type TDate = string;
export type TDateTime = string;

export enum EntityType {
  ACCOUNT = "ACCOUNT",
  TRANSACTION = "TRANSACTION",
  BUDGET = "BUDGET",
  CURRENCY = "CURRENCY",
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
