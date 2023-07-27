import { compact } from 'lodash';
import { ReactNode } from 'react';

import { LinkButton } from './Button';

import { WithDataTestId } from './Common';
import Icon from './Icon';

interface NavbarItem {
  key: string;
  label: string;
  customLabel?: ReactNode;
  isActive: boolean;
  icon: ReactNode;
  onClick: () => void;
  children?: Array<NavbarItem>;
  visible?: boolean;
}

interface NavbarProps {
  items: Array<NavbarItem>;
  className?: string;
}

const renderNavbarItems = (dataTestId: string, items: NavbarItem[]) =>
  items.map((item: NavbarItem): JSX.Element[] => {
    if (item.visible === false) {
      return [];
    }

    return compact([
      <LinkButton
        className={`flex items-center gap-1 !p-0 no-underline hover:opacity-75 ${item.isActive ? 'opacity-75' : ''}`}
        testId={`${dataTestId}_${item.key}`}
        onClick={item.onClick || (() => ({}))}
        key={item.key}
        title={item.label}>
        {item.icon && <Icon>{item.icon}</Icon>} {item.customLabel || item.label}
      </LinkButton>,
      item.children && (
        <div key={`subitems_${item.key}`} className='flex flex-col pl-4 align-middle'>
          {renderNavbarItems(dataTestId, item.children || [])}
        </div>
      ),
    ]);
  });

const Navbar = (props: NavbarProps & WithDataTestId) => {
  return (
    <nav className={`bottom-0 left-0 top-0 w-60 bg-background-800 ${props.className || ''}`} data-testid={props.testId}>
      {renderNavbarItems(props.testId, props.items)}
    </nav>
  );
};

export default Navbar;
