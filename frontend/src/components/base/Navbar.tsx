import { Menu as AntdMenu } from 'antd';
import { ReactNode } from 'react';

import { WithDataTestId } from './Common';

interface NavbarItem {
  key: string;
  label: string | ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  children?: Array<NavbarItem>;
}

interface NavbarProps {
  items: Array<NavbarItem>;
}

const itemsWithDataTestId = (rootTestId: string, items: Array<NavbarItem>) =>
  items.map((item) => {
    if (item.children) {
      item.children = itemsWithDataTestId(rootTestId, item.children);
    }

    return {
      ...item,
      label: <span data-test-id={`${rootTestId}_${item.key}`}>{item.label}</span>,
    };
  });

const Navbar = (props: NavbarProps & WithDataTestId) => (
  <nav data-test-id={props['data-test-id']}>
    <AntdMenu
      mode='horizontal'
      triggerSubMenuAction='click'
      {...props}
      items={itemsWithDataTestId(props['data-test-id'], props.items)}
    />
  </nav>
);

export default Navbar;
