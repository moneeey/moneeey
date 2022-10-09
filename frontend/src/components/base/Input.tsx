import {
  Checkbox as AntdCheckbox,
  Input as AntdInput,
  InputNumber as AntdInputNumber,
  CheckboxProps,
  InputNumberProps,
  InputProps,
} from 'antd';
import { TextAreaProps } from 'antd/lib/input';

import { WithDataTestId } from './Common';

const Input = (props: InputProps & WithDataTestId) => <AntdInput {...props} />;
const InputNumber = (props: InputNumberProps & WithDataTestId) => <AntdInputNumber {...props} />;
const TextArea = (props: TextAreaProps & WithDataTestId) => <AntdInput.TextArea {...props} />;
const Checkbox = (props: CheckboxProps & WithDataTestId) => <AntdCheckbox {...props} />;

export { Input, InputNumber, TextArea, Checkbox };
