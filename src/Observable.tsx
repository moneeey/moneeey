import React from "react";
import * as Bacon from "baconjs";

export default class Observable<T> {
  bus = new Bacon.Bus<T>();

  get listen() { return this.bus; }

  dispatch(value: T) {
    this.bus.push(value);
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
  React.useEffect(() => {
    Bacon.combineAsArray(...[subjects.map(s => s.listen)])
      .onValue(_v => setVersion(v => v + 1))
  }, [subjects, setVersion]);
  return children(version);
}
