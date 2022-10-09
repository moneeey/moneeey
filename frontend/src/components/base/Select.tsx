import { Select as AntdSelect, SelectProps } from 'antd'

import { WithDataTestId } from './Common'

const Select = (props: SelectProps & WithDataTestId) => (
  <div data-test-id={props['data-test-id']}>
    <AntdSelect {...props} />
  </div>
)

export { Select as default }
