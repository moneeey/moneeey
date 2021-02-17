export enum NavigationArea {
  Home = "Home",
  Tag = "Tag",
  Accounts = "Accounts",
  Payees = "Payees",
  Currencies = "Currencies",
}

export default class NavigationStore {
  area: NavigationArea = NavigationArea.Home;
  detail: string = "";

  navigate(area: NavigationArea, detail: string = "") {
    this.area = area;
    this.detail = detail;
  }
}
