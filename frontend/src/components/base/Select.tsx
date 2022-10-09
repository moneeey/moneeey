import { Select as AntdSelect, SelectProps } from 'antd';

import { WithDataTestId } from './Common';

const Select = (props: SelectProps & WithDataTestId) => <AntdSelect {...props} />;

export { Select as default };
