import { TCurrencyUUID } from "./Currency";
import { IBaseEntity, TDate } from "./Entity";

export type TAccountUUID = string;

export enum AccountType {
  CHECKING = "CHECKING",
  CREDIT_CARD = "CREDIT_CARD",
  PAYEE = "PAYEE",
}

export interface IAccount extends IBaseEntity {
  account_uuid: TAccountUUID;
  currency_uuid: TCurrencyUUID;
  name: string;
  created: TDate;
  type: AccountType;
}
