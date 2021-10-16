import React from "react";
import _ from 'lodash';
import * as Bacon from "baconjs";
import Observable from "../shared/Observable";

interface IObserveProps {
  children: any;
  subjects: Array<Observable<any>>;
}

export default function Observe({ children, subjects }: IObserveProps) {
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    const streams = _.map(subjects, (s: any) => s.listen)
    Bacon.combineAsArray(...streams)
      .take(1)
      .log()
      .onValue(_streamValues => setVersion(v => v + 1))
  }, [subjects, setVersion]);
  return children(version);
}
