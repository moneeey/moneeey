import { TCurrencyUUID } from "./Currency";
import { IBaseEntity, TDate } from "./Entity";
import MappedStore from "./MappedStore";

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

export class AccountStore extends MappedStore<IAccount> {
  referenceAccount: TAccountUUID = "";

  constructor() {
    super((a) => a.account_uuid);
  }

  add(account: IAccount) {
    super.add(account);
    if (!this.referenceAccount && account.type === AccountType.CHECKING) {
      this.referenceAccount = account.account_uuid;
    }
  }

  allPayees() {
    return this.all().filter((acct) => acct.type === AccountType.PAYEE);
  }

  allNonPayees() {
    return this.all().filter((acct) => acct.type !== AccountType.PAYEE);
  }

  findByName(name: string) {
    return this.all().filter((acct) => acct.name === name)[0];
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

  get referenceAccountName() {
    if (this.referenceAccount) {
      const refByUuid = this.byUuid(this.referenceAccount);
      return (refByUuid && refByUuid.name) || "";
    }
    return "";
  }
}
