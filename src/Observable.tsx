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

export function Observe({
  subjects,
  children,
}: {
  children: (version: number) => React.ReactElement;
  subjects: Observable<any>[];
}) {
  const [version, setVersion] = React.useState(0);
  const [timer, setTimer] = React.useState(null as any);
  React.useEffect(() => {
    const observing = (_newValue: any) => {
      clearTimeout(timer);
      setTimer(
        setTimeout(() => {
          setVersion(version + 1);
        }, OBSERVE_UPDATE_DEBOUNCE)
      );
    };
    subjects.forEach(subject => subject.addObserver(observing));
    return () => {
      subjects.forEach(subject => subject.removeObserver(observing));
    };
  }, [subjects, setVersion, version, timer]);
  return children(version);
}
