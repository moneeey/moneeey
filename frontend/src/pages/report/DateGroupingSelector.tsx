import { DownOutlined } from '@ant-design/icons'
import { Button, Dropdown, Menu } from 'antd'
import _ from 'lodash'

import { PeriodGroup, PeriodGroups } from './ReportUtils'

export function DateGroupingSelector({
  setPeriod,
  period,
}: {
  setPeriod: (newPeriod: PeriodGroup) => void
  period: PeriodGroup
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
      trigger={['click']}
    >
      <Button
        type="link"
        className="ant-dropdown-link"
        onClick={(e) => e.preventDefault()}
      >
        {period.label} <DownOutlined />
      </Button>
    </Dropdown>
  )
}
