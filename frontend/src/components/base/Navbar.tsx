import { Menu as AntdMenu } from 'antd'
import { ReactNode } from 'react'

interface NavbarItem {
  key: string
  label: string | ReactNode
  icon?: ReactNode
  onClick?: () => void
  children?: Array<NavbarItem>
}

interface NavbarProps {
  items: Array<NavbarItem>
}

const Navbar = (props: NavbarProps) => <AntdMenu mode='horizontal' triggerSubMenuAction='click' {...props} />

export default Navbar
