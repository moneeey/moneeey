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

  navigate(area: NavigationArea, detail: string = "") {
    this.area = area;
    this.detail = detail;
    this.dispatch(this);
  }

  get full_path() {
    return this.area + "/" + this.detail;
  }
}
