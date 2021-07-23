import Observable from "./Observable";

export default class NavigationStore extends Observable<string> {
  dateFormat: string = 'dd/MM/yyy';

  navigate(url: string) {
    this.dispatch(url);
  }
}
