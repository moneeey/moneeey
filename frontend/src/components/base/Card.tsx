import { ReactNode } from 'react';

import { WithDataTestId } from './Common';

interface CardProps {
  className?: string;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

const Card = ({ 'data-test-id': dataTestId, header, children, footer, className }: CardProps & WithDataTestId) => (
  <article className={`${className || ''}`} data-test-id={dataTestId}>
    <header>{header}</header>
    <article>{children}</article>
    <footer className='mt-4'>{footer}</footer>
  </article>
);

export default Card;
