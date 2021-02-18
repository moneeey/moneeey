export type Observer<T> = (value: T) => void;

export default class Observable<T> {
  observers: Observer<T>[] = [];

  addObserver(observer: Observer<T>) {
    this.observers.push(observer);
  }

  dispatch(value: T) {
    this.observers.forEach((fn: Observer<T>) => fn(value));
  }
}
