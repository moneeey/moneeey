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
  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <section className='mn-tabs'>
      <nav data-test-id={props['data-test-id']}>
        <Space>
          {props.items.map((item, idx) => (
            <LinkButton
              key={item.key}
              onClick={() => setSelectedIdx(idx)}
              data-test-id={`${props['data-test-id']}_${item.key}`}
              className={idx === selectedIdx ? 'mn-tab-active' : ''}>
              {item.label}
            </LinkButton>
          ))}
        </Space>
      </nav>
      {props.items[selectedIdx]?.children}
    </section>
  );
};

export default Tabs;
