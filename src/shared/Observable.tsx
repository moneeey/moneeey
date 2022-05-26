type HandlerFn<T> = (value: T) => void

export default class Observable<T> {
  listeners: Array<HandlerFn<T>> = []

  addListener(handler: HandlerFn<T>) {
    this.listeners = [...this.listeners, handler]
  }

  removeListener(handler: HandlerFn<T>) {
    this.listeners = this.listeners.filter(hn => hn !== handler)
  }

  dispatch(value: T) {
    this.listeners.forEach(cb => cb(value))
  }
}
