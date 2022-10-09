import { Tabs as AntdTabs } from 'antd'
import { ReactNode } from 'react'

import { WithDataTestId } from './Common'

interface TabItem {
  key: string
  label: string | ReactNode
  children?: ReactNode | ReactNode[]
}

interface TabsProps {
  className?: string
  items: Array<TabItem>
}

const Tabs = (props: TabsProps & WithDataTestId) => (
  <nav data-test-id={props['data-test-id']}>
    <AntdTabs {...props} />
  </nav>
)

export default Tabs
