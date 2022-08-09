import { action, makeObservable, observable } from 'mobx'

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
      complete: action
    })

    this.loadFromSession()
  }

  loadFromSession() {
    this.auth_code = window.sessionStorage.getItem('auth_code') || ''
    this.email = window.sessionStorage.getItem('email') || ''
  }

  saveToSession() {
    window.sessionStorage.setItem('auth_code', this.auth_code)
    window.sessionStorage.setItem('email', this.email)
  }

  async post(url: string, body: object) {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    })
    return await response.json()
  }

  async start(email: string) {
    this.email = email
    const { success, auth_code } = await this.post('/auth/start', { email: this.email })
    this.auth_code = auth_code
    this.saveToSession()
    return success
  }

  async checkLoggedIn() {
    const { success } = await this.post('/auth/check', { email: this.email, auth_code: this.auth_code })
    this.loggedIn = success
    return success
  }

  async complete(email: string, auth_code: string, confirm_code: string) {
    this.email = email
    this.auth_code = auth_code
    this.saveToSession()
    const { success, error } = await this.post('/auth/complete', { email, auth_code, confirm_code })
    this.loggedIn = success
    return { success, error }
  }
}
