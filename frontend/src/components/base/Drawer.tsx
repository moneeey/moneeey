import { ReactNode } from 'react';

import { WithDataTestId } from './Common';

import './Drawer.less';

interface DrawerProps {
  className?: string;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

const Drawer = ({ 'data-test-id': dataTestId, header, children, footer, className }: DrawerProps & WithDataTestId) => (
  <article className={`mn-drawer ${className || ''}`} data-test-id={dataTestId}>
    <header>{header}</header>
    <article>{children}</article>
    <footer>{footer}</footer>
  </article>
);

export default Drawer;
