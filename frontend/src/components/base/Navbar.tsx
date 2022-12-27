import { Bars3Icon } from '@heroicons/react/24/outline';
import { ReactNode, useState } from 'react';

import { LinkButton } from './Button';

import { WithDataTestId } from './Common';

import './Navbar.less';
import { TextTitle } from './Text';

interface NavbarItem {
  key: string;
  label: string;
  customLabel?: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  children?: Array<NavbarItem>;
  visible?: boolean;
}

interface NavbarProps {
  header?: string | ReactNode;
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
        title={item.label}>
        {item.icon} {item.customLabel || item.label}
      </LinkButton>,
      <div key={`subitems_${item.key}`} className='subitems'>
        {renderNavbarItems(dataTestId, item.children || [])}
      </div>,
    ];
  });

const Navbar = (props: NavbarProps & WithDataTestId) => {
  const [isExpanded, setExpanded] = useState(true);

  return (
    <nav className={`mn-navbar ${isExpanded ? 'expanded' : ''}`} data-test-id={props['data-test-id']}>
      <header>
        <TextTitle onClick={() => setExpanded(!isExpanded)}>
          {isExpanded && props.header}
          <Bars3Icon />
        </TextTitle>
      </header>
      {isExpanded && <section>{renderNavbarItems(props['data-test-id'], props.items)}</section>}
    </nav>
  );
};

export default Navbar;
