import { ReactNode } from 'react';

import { ClassNameType } from '../../utils/Utils';

const BaseSpace = (baseClassname: ClassNameType) =>
  function Spacer({ children, className }: { children: ReactNode | ReactNode[]; className?: string }) {
    return <div className={` ${baseClassname || ''} ${className || ''}`}>{children}</div>;
  };

export const Space = BaseSpace('flex flex-row items-center gap-4');
export const VerticalSpace = BaseSpace('flex flex-col gap-4');
export default Space;
