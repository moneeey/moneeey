import { Checkbox as AntdCheckbox, Input as AntdInput, CheckboxProps, InputProps } from 'antd'
import { TextAreaProps } from 'antd/lib/input'

const Input = (props: InputProps) => <AntdInput {...props} />
const TextArea = (props: TextAreaProps) => <AntdInput.TextArea {...props} />
const Checkbox = (props: CheckboxProps) => <AntdCheckbox {...props} />

export { Input, TextArea, Checkbox }
