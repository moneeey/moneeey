import { Space as AntdSpace } from 'antd'

import { ReactNode } from 'react'

const Space = ({ children, className }: { children: ReactNode | ReactNode[]; className?: string }) => (
  <AntdSpace className={className}>{children}</AntdSpace>
)

export default Space
