import { DatePicker as AntdDatePicker, DatePickerProps } from 'antd';

import { WithDataTestId } from './Common';

const DatePicker = (props: DatePickerProps & WithDataTestId) => <AntdDatePicker {...props} />;

export { DatePicker as default };
