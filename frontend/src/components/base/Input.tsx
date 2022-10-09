import {
  Checkbox as AntdCheckbox,
  Input as AntdInput,
  InputNumber as AntdInputNumber,
  CheckboxProps,
  InputNumberProps,
  InputProps,
} from 'antd'
import { TextAreaProps } from 'antd/lib/input'

const Input = (props: InputProps) => <AntdInput {...props} />
const InputNumber = (props: InputNumberProps) => <AntdInputNumber {...props} />
const TextArea = (props: TextAreaProps) => <AntdInput.TextArea {...props} />
const Checkbox = (props: CheckboxProps) => <AntdCheckbox {...props} />

export { Input, InputNumber, TextArea, Checkbox }
