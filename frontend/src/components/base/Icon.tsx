import { ReactNode } from 'react';

import favicon from '../../../favicon.svg';

import { WithDataTestId } from './Common';

export default function Icon({
  children,
  className,
  testId,
}: {
  children: ReactNode | ReactNode[];
  className?: string;
} & Partial<WithDataTestId>) {
  return (
    <div className={`h-4 w-4 ${className || ''}`} data-testid={testId}>
      {children}
    </div>
  );
}

export const FavIcon = () => (
  <Icon className='h-6 w-6'>
    <img src={favicon} />
  </Icon>
);
