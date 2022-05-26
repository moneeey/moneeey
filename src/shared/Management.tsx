import Observable from './Observable';

export default class ManagementStore extends Observable<ManagementStore> {
  auth_code: string = '';
  email: string = '';
  loggedIn: boolean = false;

  constructor() {
    super()

    this.loadFromSession()
    this.monitorAuthentication(100)
  }

  loadFromSession() {
    this.auth_code = window.sessionStorage.getItem('auth_code') || ''
    this.email = window.sessionStorage.getItem('email') || ''
  }

  saveToSession() {
    window.sessionStorage.setItem('auth_code', this.auth_code)
    window.sessionStorage.setItem('email', this.email)
  }

  monitorAuthentication(delay: number) {
    setTimeout(async () => {
      if (!this.isLoggedIn) {
        await this.checkLoggedIn()
      }
      this.monitorAuthentication(Math.max(delay * 2, 60*60*1000))
    }, delay)
  }

  get isLoggedIn() {
    return this.loggedIn
  }

  set isLoggedIn(value: boolean) {
    if (value !== this.loggedIn) {
      this.loggedIn = value
      this.dispatch(this)
    }
  }

  async post(url: string, body: object) {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    })
    return await response.json()
  }

  async start(email: string) {
    this.email = email
    const { success, auth_code } = await this.post('/auth/start', { email: this.email })
    this.auth_code = auth_code
    this.saveToSession()
    this.dispatch(this)
    return success
  }

  async checkLoggedIn() {
    const { success } = await this.post('/auth/check', { email: this.email, auth_code: this.auth_code })
    this.isLoggedIn = success
    return success
  }

  async complete(email: string, auth_code: string, confirm_code: string) {
    this.email = email
    this.auth_code = auth_code
    this.saveToSession()
    const { success, error } = await this.post('/auth/complete', { email, auth_code, confirm_code })
    this.isLoggedIn = success
    return { success, error }
    
  }
}
