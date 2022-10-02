import { Tabs as AntdTabs } from 'antd'
import { ReactNode } from 'react'

interface TabItem {
  key: string
  label: string | ReactNode
  children?: ReactNode | ReactNode[]
}

interface TabsProps {
  className?: string
  items: Array<TabItem>
}

const Tabs = (props: TabsProps) => <AntdTabs {...props} />

export default Tabs
