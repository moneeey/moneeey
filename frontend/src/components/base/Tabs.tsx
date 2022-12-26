import { ReactNode, useState } from 'react';

import { LinkButton } from './Button';

import { WithDataTestId } from './Common';
import './Tabs.less';

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

const Tabs = (props: TabsProps & WithDataTestId) => {
  const [selected, setSelected] = useState(props.items[0].key);

  return (
    <section className='mn-tabs'>
      <nav data-test-id={props['data-test-id']}>
        {itemsWithDataTestId(props['data-test-id'], props.items).map((item) => (
          <LinkButton key={item.key} onClick={() => setSelected(item.key)}>
            {item.label}
          </LinkButton>
        ))}
      </nav>
      {props.items.find((item) => item.key === selected)?.children}
    </section>
  );
};

export default Tabs;
