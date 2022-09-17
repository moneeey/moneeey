import { action, computed, makeObservable, observable } from 'mobx'

export enum NavigationModal {
  NONE,
  LANDING,
  SYNC,
}

export default class NavigationStore {
  dateFormat = 'dd/MM/yyy'
  _navigateToUrl = ''
  _modal = NavigationModal.NONE

  constructor() {
    makeObservable(this, {
      _navigateToUrl: observable,
      _modal: observable,
      navigateTo: computed,
      navigate: action,
      modal: computed,
      openModal: action,
    })
  }

  navigate(url: string) {
    this._navigateToUrl = url
  }

  get navigateTo() {
    return this._navigateToUrl
  }

  get modal() {
    return this._modal
  }

  openModal(modal: NavigationModal) {
    this._modal = modal
  }

  closeModal() {
    this.openModal(NavigationModal.NONE)
  }
}
