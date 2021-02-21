import { format } from "date-fns";
import { TAccountUUID, IAccount } from "./Account";
import { formatDateAs, TDate } from "./Entity";
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
  dateFormat = "dd/MM/yyyy";

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

  formatDate(date: TDate) {
    return formatDateAs(date, this.dateFormat);
  }
}
