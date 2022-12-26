import { ReactNode } from 'react';

import './Space.less';

const Space = ({ children, className }: { children: ReactNode | ReactNode[]; className?: string }) => (
  <div className={`mn-space ${className || ''}`}>{children}</div>
);

export default Space;
