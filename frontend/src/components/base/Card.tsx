import { ReactNode } from 'react';

import { WithDataTestId } from './Common';

import './Card.less';

interface CardProps {
  className?: string;
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

const Card = ({ 'data-test-id': dataTestId, header, children, footer, className }: CardProps & WithDataTestId) => (
  <article className={`mn-card ${className || ''}`} data-test-id={dataTestId}>
    <header>{header}</header>
    <article>{children}</article>
    <footer>{footer}</footer>
  </article>
);

export default Card;
