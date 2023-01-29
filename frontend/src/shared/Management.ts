import { action, makeObservable, observable } from 'mobx';

import { StorageKind, asyncTimeout, getStorage, setStorage } from '../utils/Utils';

export default class ManagementStore {
  auth_code = '';

  email = '';

  loggedIn = false;

  constructor() {
    makeObservable(this, {
      auth_code: observable,
      email: observable,
      loggedIn: observable,
      post: action,
      start: action,
      checkLoggedIn: action,
      complete: action,
    });

    this.loadFromSession();
    this.completeLogin();
  }

  loadFromSession() {
    this.auth_code = getStorage('auth_code', '', StorageKind.SESSION) || '';
    this.email = getStorage('email', '', StorageKind.SESSION) || '';
  }

  saveToSession() {
    setStorage('auth_code', this.auth_code, StorageKind.SESSION);
    setStorage('email', this.email, StorageKind.SESSION);
  }

  async completeLogin() {
    const { search } = window.location;
    const { confirm_code, auth_code, email } = search
      .substring(1)
      .split('&')
      .map((field) => field.split('='))
      .reduce((accm, [key, value]) => ({ ...accm, [key]: value }), {
        confirm_code: '',
        auth_code: '',
        email: '',
      });

    if (email && confirm_code && auth_code) {
      const res = await this.complete(email, auth_code, confirm_code);
      if (res.success) {
        // eslint-disable-next-line require-atomic-updates
        window.location.search = '';
      }
    }
  }

  async post<T>(url: string, body: object) {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    return (await response.json()) as T;
  }

  async start(email: string, onLoggedIn: () => void) {
    this.email = email;

    const { success, auth_code } = await this.post<{ success: boolean; auth_code: string }>('/api/auth/start', {
      email: this.email,
    });
    this.auth_code = auth_code;
    this.saveToSession();

    if (success) {
      this.waitUntilLoggedIn(onLoggedIn);
    }

    return { success };
  }

  async waitUntilLoggedIn(onLoggedIn: () => void) {
    if (await this.checkLoggedIn()) {
      onLoggedIn();
    } else {
      await asyncTimeout(() => this.waitUntilLoggedIn(onLoggedIn), 2000);
    }
  }

  async checkLoggedIn() {
    const { success } = await this.post<{ success: boolean }>('/api/auth/check', {
      email: this.email,
      auth_code: this.auth_code,
    });
    this.loggedIn = success;

    return success;
  }

  async complete(email: string, auth_code: string, confirm_code: string) {
    this.email = email;
    this.auth_code = auth_code;
    this.saveToSession();
    const { success, error } = await this.post<{ success: boolean; error: string }>('/api/auth/complete', {
      email,
      auth_code,
      confirm_code,
    });
    this.loggedIn = success;

    return { success, error };
  }
}
