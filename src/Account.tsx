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

export class AccountStore {
  accountsByUuid: { [account_uuid: string]: IAccount } = {};
  accountsList: IAccount[] = [];
  referenceAccount: TAccountUUID = "";

  add(account: IAccount) {
    this.accountsByUuid = {
      ...this.accountsByUuid,
      [account.account_uuid]: account,
    };
    this.accountsList = [...this.accountsList, account];
  }

  findByUuid(account_uuid: TAccountUUID) {
    return this.accountsByUuid[account_uuid];
  }

  findByName(name: string) {
    return this.accountsList.filter((acct) => acct.name === name)[0];
  }

  findUuidByName(name: string) {
    return this.findByName(name).account_uuid;
  }

  setReferenceAccount(account: IAccount) {
    this.referenceAccount = account.account_uuid;
  }

  get getReferenceAccountUuid() {
    return this.referenceAccount;
  }
}
