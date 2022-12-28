import ReactDatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css';

import { WithDataTestId } from './Common';
import { InputContainer, InputProps } from './Input';

type DatePickerProps = InputProps<Date> & WithDataTestId;

const DatePicker = ({
  className,
  value,
  onChange,
  'data-test-id': dataTestId,
  disabled,
  readOnly,
  prefix,
  suffix,
  isError,
}: DatePickerProps) => {
  return InputContainer({
    prefix,
    suffix,
    isError,
    input: (
      <ReactDatePicker
        {...{ 'data-test-id': dataTestId }}
        className={`mn-datepicker ${className || ''}`}
        selected={value}
        onChange={(newValue: Date) => newValue && onChange(newValue)}
        readOnly={readOnly}
        disabled={disabled}
      />
    ),
  });
};

export { DatePicker as default };
