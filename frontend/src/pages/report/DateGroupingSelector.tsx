import { DownOutlined } from '@ant-design/icons';
import { Dropdown, Menu } from 'antd';
import _ from 'lodash';

import { LinkButton } from '../../components/base/Button';

import { PeriodGroup, PeriodGroups } from './ReportUtils';

const DateGroupingSelector = function ({
  setPeriod,
  period,
}: {
  setPeriod: (newPeriod: PeriodGroup) => void;
  period: PeriodGroup;
}) {
  return (
    <Dropdown
      overlay={
        <Menu>
          {_(_.values(PeriodGroups))
            .sortBy('order')
            .map((p) => (
              <Menu.Item key={p.label} onClick={() => setPeriod(p)}>
                {p.label}
              </Menu.Item>
            ))
            .value()}
        </Menu>
      }
      trigger={['click']}>
      <LinkButton className='ant-dropdown-link' onClick={(e) => e.preventDefault()}>
        {period.label} <DownOutlined />
      </LinkButton>
    </Dropdown>
  );
};

export default DateGroupingSelector;
