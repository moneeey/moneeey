import React from "react";
import Observable from "../shared/Observable";
import * as Bacon from "baconjs";

interface IObserveProps {
  subjects: Observable<any>[];
  children: any;
}

export default function Observe({ children, subjects, }: IObserveProps) {
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    Bacon.combineAsArray(...[subjects.map(s => s.listen)])
      .onValue(_v => setVersion(v => v + 1))
  }, [subjects, setVersion]);
  return children(version);
}
