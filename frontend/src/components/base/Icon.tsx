import { ReactNode } from 'react';

import favicon from '../../../favicon.svg';

export default function Icon({ children, className }: { children: ReactNode | ReactNode[]; className?: string }) {
  return <div className={`h-4 w-4 ${className || ''}`}>{children}</div>;
}

export const FavIcon = () => (
  <Icon className='h-6 w-6'>
    <img src={favicon} />
  </Icon>
);
