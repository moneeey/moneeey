import { action, computed, makeObservable, observable } from "mobx";

export default class NavigationStore {
  dateFormat: string = 'dd/MM/yyy';
  _navigateToUrl: string = '';

  constructor() {
    makeObservable(this, {
      _navigateToUrl: observable,
      navigateTo: computed,
      navigate: action,
    })
  }

  navigate(url: string) {
    this._navigateToUrl = url
  }

  get navigateTo() {
    const url = this._navigateToUrl
    this._navigateToUrl = ''
    return url
  }
}
