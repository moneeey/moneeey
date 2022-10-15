import { action, computed, makeObservable, observable } from 'mobx';

import Logger from './Logger';

export enum NavigationModal {
  NONE = 'NONE',
  LANDING = 'LANDING',
  SYNC = 'SYNC',
}

type NotificationType = 'warning' | 'success' | 'info' | 'error';

export default class NavigationStore {
  dateFormat = 'dd/MM/yyy';

  navigateToUrl = '';

  currentModal = NavigationModal.NONE;

  notifications: Array<{
    type: NotificationType;
    text: string;
  }> = [];

  logger: Logger;

  constructor(parent: Logger) {
    this.logger = new Logger('navigationStore', parent);

    makeObservable(this, {
      navigateToUrl: observable,
      currentModal: observable,
      notifications: observable,
      clearNotifications: action,
      notify: action,
      navigateTo: computed,
      navigate: action,
      modal: computed,
      openModal: action,
    });
  }

  navigate(url: string) {
    if (url) {
      this.logger.info('navigate', { url });
    }
    this.navigateToUrl = url;
  }

  clearNotifications() {
    this.notifications = [];
  }

  get navigateTo() {
    return this.navigateToUrl;
  }

  get modal() {
    return this.currentModal;
  }

  openModal(modal: NavigationModal) {
    this.logger.info('openModal', { modal });
    this.currentModal = modal;
  }

  closeModal() {
    this.openModal(NavigationModal.NONE);
  }

  notify(type: NotificationType, text: string) {
    this.logger.info('notify', { type, text });
    this.notifications.push({ text, type });
  }

  warning(text: string) {
    this.notify('warning', text);
  }

  success(text: string) {
    this.notify('success', text);
  }

  info(text: string) {
    this.notify('info', text);
  }

  error(text: string) {
    this.notify('error', text);
  }
}
