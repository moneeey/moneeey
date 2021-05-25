import { TCurrencyUUID } from "./Currency";
import { TDate } from "./Date";
import { IBaseEntity } from "./Entity";
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
  constructor() {
    super((a) => a.account_uuid);
  }

  add(account: IAccount) {
    super.add(account);
  }

  allPayees() {
    return this.all().filter((acct) => acct.type === AccountType.PAYEE);
  }

  allNonPayees() {
    return this.all().filter((acct) => acct.type !== AccountType.PAYEE);
  }

  byName(name: string) {
    return this.all().filter((acct) => acct.name === name)[0];
  }

  uuidByName(name: string) {
    return this.byName(name).account_uuid;
  }

  accountTags(account_uuid: TAccountUUID) {
    const acct = this.byUuid(account_uuid);
    if (acct) return acct.tags;
    return [];
  }
}
