import {
  Checkbox as AntdCheckbox,
  Input as AntdInput,
  InputNumber as AntdInputNumber,
  CheckboxProps,
  InputNumberProps,
  InputProps,
} from 'antd'
import { TextAreaProps } from 'antd/lib/input'

import { WithDataTestId } from './Common'

const Input = (props: InputProps & WithDataTestId) => (
  <div data-test-id={props['data-test-id']}>
    <AntdInput {...props} />
  </div>
)
const InputNumber = (props: InputNumberProps & WithDataTestId) => (
  <div data-test-id={props['data-test-id']}>
    <AntdInputNumber {...props} />
  </div>
)
const TextArea = (props: TextAreaProps & WithDataTestId) => (
  <div data-test-id={props['data-test-id']}>
    <AntdInput.TextArea {...props} />
  </div>
)
const Checkbox = (props: CheckboxProps & WithDataTestId) => (
  <div data-test-id={props['data-test-id']}>
    <AntdCheckbox {...props} />
  </div>
)

export { Input, InputNumber, TextArea, Checkbox }
