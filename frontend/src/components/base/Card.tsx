import { ReactNode } from 'react';

import { WithDataTestId } from './Common';

interface CardProps {
  className?: string;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

const Card = ({ testId, header, children, footer, className }: CardProps & WithDataTestId) => (
  <article className={`${className || ''}`} data-testid={testId}>
    <header>{header}</header>
    <article>{children}</article>
    <footer className='mt-4'>{footer}</footer>
  </article>
);

export default Card;
