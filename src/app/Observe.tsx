import React from "react";
import _ from 'lodash';
import Observable from "../shared/Observable";

interface IObserveProps {
  children: any;
  subjects: Array<Observable<any>>;
}

export default function Observe({ children, subjects }: IObserveProps) {
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    const handler = (_value: any) => {
      setVersion((version: number) => version + 1)
    }
    subjects.forEach(subject => subject.addListener(handler))
  }, [subjects, setVersion]);
  return <div data-version={version}>{children}</div>;
}
