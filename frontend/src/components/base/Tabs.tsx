import { ReactNode, useState } from 'react';

import { StorageKind, getStorage, setStorage } from '../../utils/Utils';

import { LinkButton } from './Button';
import { WithDataTestId } from './Common';
import Space from './Space';

interface TabItem {
  key: string;
  label: string | ReactNode;
  children?: ReactNode | ReactNode[];
}

interface TabsProps {
  className?: string;
  items: Array<TabItem>;
  persist?: StorageKind;
  onChange?: (selectedIdx: number) => void;
}

const Tabs = (props: TabsProps & WithDataTestId) => {
  const key = `Tabs_${props['data-test-id']}`;
  const [selectedIdx, setSelectedIdx] = useState(props.persist ? parseInt(getStorage(key, '0', props.persist), 10) : 0);
  const onChange = (newIdx: number) => {
    setSelectedIdx(newIdx);
    if (props.persist) {
      setStorage(key, `${newIdx}`, props.persist);
    }
    if (props.onChange) {
      props.onChange(newIdx);
    }
  };

  return (
    <section>
      <nav data-test-id={props['data-test-id']}>
        <Space className='border-b border-b-background-300'>
          {props.items.map((item, idx) => (
            <LinkButton
              key={item.key}
              onClick={() => onChange(idx)}
              data-test-id={`${props['data-test-id']}_${item.key}`}
              className={idx === selectedIdx ? 'underline' : ''}>
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
