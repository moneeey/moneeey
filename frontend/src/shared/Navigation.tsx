import { action, computed, makeObservable, observable } from 'mobx'

export default class NavigationStore {
  dateFormat = 'dd/MM/yyy'
  _navigateToUrl = ''

  constructor() {
    makeObservable(this, {
      _navigateToUrl: observable,
      navigateTo: computed,
      navigate: action
    })
  }

  navigate(url: string) {
    this._navigateToUrl = url
  }

  get navigateTo() {
    return this._navigateToUrl
  }
}