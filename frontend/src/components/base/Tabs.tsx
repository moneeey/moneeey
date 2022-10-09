import { Tabs as AntdTabs } from 'antd';
import { ReactNode } from 'react';

import { WithDataTestId } from './Common';

interface TabItem {
  key: string;
  label: string | ReactNode;
  children?: ReactNode | ReactNode[];
}

interface TabsProps {
  className?: string;
  items: Array<TabItem>;
}

const itemsWithDataTestId = (rootTestId: string, items: Array<TabItem>) =>
  items.map((item) => {
    return { ...item, label: <span data-test-id={`${rootTestId}_${item.key}`}>{item.label}</span> };
  });

const Tabs = (props: TabsProps & WithDataTestId) => (
  <nav data-test-id={props['data-test-id']}>
    <AntdTabs {...props} items={itemsWithDataTestId(props['data-test-id'], props.items)} />
  </nav>
);

export default Tabs;
