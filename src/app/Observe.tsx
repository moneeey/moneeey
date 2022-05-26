import React from "react";
import Observable from "../shared/Observable";

interface IObserveProps {
  children: any;
  subjects: Array<Observable<any>>;
}

export default function Observe({ children, subjects }: IObserveProps) {
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    const handler = (_value: any) => {
      setVersion(version + 1)
    }
    subjects.forEach(subject => subject.addListener(handler))
    return () => {
      subjects.forEach(subject => subject.removeListener(handler))
    }
  }, [subjects, version, setVersion]);
  return children(version)
}
