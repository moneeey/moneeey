import { format, formatISO, parse } from "date-fns";
import { v4 as uuidv4 } from "uuid";

export const generateUuid = () => uuidv4();
export type TMonetary = number;

export type TDate = string;
export type TDateTime = string;
const TDateFormat = "yyyy-MM-dd";

export const currentDate = () => formatDate(new Date());
export const currentDateTime = () => formatISO(new Date());
export const formatDateAs = (date: TDate, pattern: string) =>
  format(parseDate(date), pattern);
export const formatDate = (date: Date) => format(date, TDateFormat);
export const parseDate = (date: TDate) => parse(date, TDateFormat, new Date());
export const compareDates = (a: TDate, b: TDate) =>
  parseDate(a).getTime() - parseDate(b).getTime();
export const randomRange = (minn: number, maxx: number) =>
  Math.random() * (maxx - minn) + minn;

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
