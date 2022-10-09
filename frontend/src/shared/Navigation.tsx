import { action, computed, makeObservable, observable } from 'mobx'

export enum NavigationModal {
  NONE,
  LANDING,
  SYNC,
}

type NotificationType = 'warning' | 'success' | 'info' | 'error'

export default class NavigationStore {
  dateFormat = 'dd/MM/yyy'

  navigateToUrl = ''

  currentModal = NavigationModal.NONE

  notifications: Array<{
    type: NotificationType
    text: string
  }> = []

  constructor() {
    makeObservable(this, {
      navigateToUrl: observable,
      currentModal: observable,
      notifications: observable,
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

  private notify(type: NotificationType, text: string) {
    this.notifications.push({ text, type })
  }

  warning(text: string) {
    this.notify('warning', text)
  }

  success(text: string) {
    this.notify('success', text)
  }

  info(text: string) {
    this.notify('info', text)
  }

  error(text: string) {
    this.notify('error', text)
  }
}
