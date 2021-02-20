import { TAccountUUID, IAccount } from "./Account";
import Observable from "./Observable";

export enum NavigationArea {
  Home = "Home",
  Tag = "Tag",
  Accounts = "Accounts",
  Payees = "Payees",
  Currencies = "Currencies",
}

export default class NavigationStore extends Observable<NavigationStore> {
  area: NavigationArea = NavigationArea.Home;
  detail: string = "";
  referenceAccount: TAccountUUID = "";

  navigate(area: NavigationArea, detail: string = "") {
    this.area = area;
    this.detail = detail;
    this.dispatch(this);
  }

  get full_path() {
    return this.area + "/" + this.detail;
  }

  setReferenceAccount(account: IAccount) {
    this.referenceAccount = account.account_uuid;
  }

  get getReferenceAccountUuid() {
    return this.referenceAccount;
  }
}
