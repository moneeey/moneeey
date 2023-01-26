import { ReactNode } from 'react';

import './Space.less';

const BaseSpace = (baseClassname: string) =>
  function Spacer({ children, className }: { children: ReactNode | ReactNode[]; className?: string }) {
    return <div className={`${baseClassname} ${className || ''}`}>{children}</div>;
  };

const Space = BaseSpace('mn-horizontal-space');
const VerticalSpace = BaseSpace('mn-vertical-space');

export default Space;
export { Space, VerticalSpace };
