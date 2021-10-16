import * as Bacon from "baconjs";

export default class Observable<T> {
  bus = new Bacon.Bus<T>();

  get listen() { return this.bus; }

  dispatch(value: T) {
    this.bus.push(value);
  }
}
