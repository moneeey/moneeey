import { DatePicker as AntdDatePicker, DatePickerProps } from 'antd'

import { WithDataTestId } from './Common'

const DatePicker = (props: DatePickerProps & WithDataTestId) => (
  <div data-test-id={props['data-test-id']}>
    <AntdDatePicker {...props} />
  </div>
)

export { DatePicker as default }
