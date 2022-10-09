import { action, makeObservable, observable } from 'mobx'

import { StorageKind, getStorage, setStorage } from '../utils/Utils'

export default class ManagementStore {
  auth_code = ''

  email = ''

  loggedIn = false

  constructor() {
    makeObservable(this, {
      auth_code: observable,
      email: observable,
      loggedIn: observable,
      post: action,
      start: action,
      checkLoggedIn: action,
      complete: action,
    })

    this.loadFromSession()
  }

  loadFromSession() {
    this.auth_code = getStorage('auth_code', '', StorageKind.SESSION) || ''
    this.email = getStorage('email', '', StorageKind.SESSION) || ''
  }

  saveToSession() {
    setStorage('auth_code', this.auth_code, StorageKind.SESSION)
    setStorage('email', this.email, StorageKind.SESSION)
  }

  async post<T>(url: string, body: object) {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    return (await response.json()) as T
  }

  async start(email: string) {
    this.email = email
    const { success, auth_code } = await this.post<{ success: boolean; auth_code: string }>('/auth/start', {
      email: this.email,
    })
    this.auth_code = auth_code
    this.saveToSession()

    return success
  }

  async checkLoggedIn() {
    const { success } = await this.post<{ success: boolean }>('/auth/check', {
      email: this.email,
      auth_code: this.auth_code,
    })
    this.loggedIn = success

    return success
  }

  async complete(email: string, auth_code: string, confirm_code: string) {
    this.email = email
    this.auth_code = auth_code
    this.saveToSession()
    const { success, error } = await this.post<{ success: boolean; error: string }>('/auth/complete', {
      email,
      auth_code,
      confirm_code,
    })
    this.loggedIn = success

    return { success, error }
  }
}
