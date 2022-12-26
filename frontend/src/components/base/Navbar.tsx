import { ReactNode } from 'react';

import { LinkButton } from './Button';

import { WithDataTestId } from './Common';

import './Navbar.less';

interface NavbarItem {
  key: string;
  label: string | ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  children?: Array<NavbarItem>;
  visible?: boolean;
}

interface NavbarProps {
  items: Array<NavbarItem>;
}

const renderNavbarItems = (dataTestId: string, items: NavbarItem[]) =>
  items.map((item: NavbarItem): JSX.Element[] => {
    if (item.visible === false) {
      return [];
    }

    return [
      <LinkButton
        className={'item'}
        data-test-id={`${dataTestId}_${item.key}`}
        onClick={item.onClick || (() => ({}))}
        key={item.key}
        title={item.label}
      />,
      <div key={`subitems_${item.key}`} className='subitems'>
        {renderNavbarItems(dataTestId, item.children || [])}
      </div>,
    ];
  });

const Navbar = (props: NavbarProps & WithDataTestId) => (
  <nav className='mn-navbar' data-test-id={props['data-test-id']}>
    {renderNavbarItems(props['data-test-id'], props.items)}
  </nav>
);

export default Navbar;
