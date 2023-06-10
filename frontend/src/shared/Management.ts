import { action, makeObservable, observable } from 'mobx';

import { StorageKind, asyncTimeout, getStorage, setStorage } from '../utils/Utils';

export enum IDatabaseLevel {
  OWNER = 90,
  USER = 50,
  INVITED = 10,
}

export interface IDatabase {
  _id: string;
  _rev: string;
  realm_host: string;
  realm_database_id: string;
  description: string;
  level: IDatabaseLevel;
}

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
        setTimeout(() => {
          window.location.search = '';
        }, 0);
      }
    }
  }

  async post<T>(url: string, body: object, headers?: object) {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
    });

    return (await response.json()) as T;
  }

  authenticatedPost<T>(url: string, body: object, headers?: object) {
    return this.post<T>(url, body, {
      authorization: `Bearer ${this.auth_code}`,
      email: this.email,
      ...headers,
    });
  }

  async start(email: string) {
    this.email = email;

    const { success, auth_code } = await this.post<{ success: boolean; auth_code: string }>('/api/auth/start', {
      email: this.email,
    });
    this.auth_code = auth_code;
    this.saveToSession();

    return { success };
  }

  async waitUntilLoggedIn() {
    const isLoggedIn = await this.checkLoggedIn();
    if (!isLoggedIn) {
      await asyncTimeout(() => this.waitUntilLoggedIn(), 2000);
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

  async logout() {
    await this.post<{ success: boolean }>('/api/auth/logout', {
      email: this.email,
      auth_code: this.auth_code,
    });
    this.auth_code = '';
    this.email = '';
    this.saveToSession();
  }

  listDatabases() {
    return this.authenticatedPost<{ databases: IDatabase[] }>('/api/storage/list', {});
  }

  createDatabase(description: string) {
    return this.authenticatedPost<{ databaseId: string }>('/api/storage/create', { description });
  }
}
