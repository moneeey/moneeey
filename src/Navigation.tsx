import { isValid } from "date-fns";
import { TAccountUUID } from "./Account";
import { formatDateAs, TDate } from "./Date";
import Observable from "./Observable";

export enum NavigationArea {
  Dashboard = "Dashboard",
  AccountTransactions = "AccountTransactions",
  TagTransactions = "TagTransactions",
  Accounts = "Accounts",
  Payees = "Payees",
  Currencies = "Currencies",
  Budgets = "Budgets",
  Reports = "Reports",
}

export default class NavigationStore extends Observable<NavigationStore> {
  area: NavigationArea = NavigationArea.Dashboard;
  detail: string = "";
  referenceAccount: TAccountUUID = "";
  dateFormat = "dd/MM/yyyy";

  navigate(area: NavigationArea, detail: string = "") {
    this.area = area;
    this.detail = detail;
    if (area === NavigationArea.AccountTransactions && detail !== "") {
      this.referenceAccount = detail;
    }
    this.dispatch(this);
  }

  get full_path() {
    return this.area + "/" + this.detail;
  }

  formatDate(date: TDate) {
    if (isValid(date)) {
      return formatDateAs(date, this.dateFormat);
    } else {
      return date;
    }
  }
}
