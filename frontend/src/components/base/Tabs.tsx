import { ReactNode, useState } from 'react';

import { LinkButton } from './Button';

import { WithDataTestId } from './Common';
import Space from './Space';
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

const Tabs = (props: TabsProps & WithDataTestId) => {
  const [selected, setSelected] = useState(props.items[0].key);

  return (
    <section className='mn-tabs'>
      <nav data-test-id={props['data-test-id']}>
        <Space>
          {props.items.map((item) => (
            <LinkButton
              key={item.key}
              onClick={() => setSelected(item.key)}
              data-test-id={`${props['data-test-id']}_${item.key}`}
              className={item.key === selected ? 'mn-tab-active' : ''}>
              {item.label}
            </LinkButton>
          ))}
        </Space>
      </nav>
      {props.items.find((item) => item.key === selected)?.children}
    </section>
  );
};

export default Tabs;
