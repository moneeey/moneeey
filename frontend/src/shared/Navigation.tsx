import { action, computed, makeObservable, observable } from 'mobx'

export enum NavigationModal {
  NONE,
  LANDING,
  SYNC,
}

export default class NavigationStore {
  dateFormat = 'dd/MM/yyy'

  navigateToUrl = ''

  currentModal = NavigationModal.NONE

  constructor() {
    makeObservable(this, {
      navigateToUrl: observable,
      currentModal: observable,
      navigateTo: computed,
      navigate: action,
      modal: computed,
      openModal: action,
    })
  }

  navigate(url: string) {
    this.navigateToUrl = url
  }

  get navigateTo() {
    return this.navigateToUrl
  }

  get modal() {
    return this.currentModal
  }

  openModal(modal: NavigationModal) {
    this.currentModal = modal
  }

  closeModal() {
    this.openModal(NavigationModal.NONE)
  }
}
