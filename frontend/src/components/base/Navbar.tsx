import { Menu as AntdMenu } from 'antd'
import { ReactNode } from 'react'

import { WithDataTestId } from './Common'

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

const Navbar = (props: NavbarProps & WithDataTestId) => (
  <nav data-test-id={props['data-test-id']}>
    <AntdMenu mode='horizontal' triggerSubMenuAction='click' {...props} />
  </nav>
)

export default Navbar
