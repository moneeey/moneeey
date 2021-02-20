import React from "react";

const OBSERVE_UPDATE_DEBOUNCE = 20;
export type Observer<T> = (value: T) => void;

export default class Observable<T> {
  observers: Observer<T>[] = [];

  addObserver(observer: Observer<T>) {
    this.observers.push(observer);
  }

  removeObserver(observer: Observer<T>) {
    this.observers = this.observers.filter((o) => o !== observer);
  }

  dispatch(value: T) {
    this.observers.forEach((fn: Observer<T>) => fn(value));
  }
}

export function Observe<T>({
  subject,
  children,
}: {
  children: (value: T) => React.ReactElement;
  subject: Observable<T>;
}) {
  const [value, setValue] = React.useState((null as unknown) as T);
  const [timer, setTimer] = React.useState(null as any);
  React.useEffect(() => {
    const observing = (newValue: T) => {
      clearTimeout(timer);
      setTimer(
        setTimeout(() => {
          setValue(newValue);
        }, OBSERVE_UPDATE_DEBOUNCE)
      );
    };
    subject.addObserver(observing);
    return () => {
      subject.removeObserver(observing);
    };
  }, [subject, value, setValue, timer]);
  return children(value);
}
