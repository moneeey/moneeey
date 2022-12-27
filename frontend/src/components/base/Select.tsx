import { ReactNode } from 'react';
import ReactSelect from 'react-select';

import { WithDataTestId } from './Common';
import { InputContainer, InputProps } from './Input';

type Option = {
  label: string | ReactNode;
  value: string;
};

type OptionsProps = {
  options: Option[];
};

type SelectProps = InputProps<string> & WithDataTestId & OptionsProps;

const Select = ({
  className,
  value,
  options,
  onChange,
  placeholder,
  'data-test-id': dataTestId,
  prefix,
  suffix,
}: SelectProps) =>
  InputContainer(
    prefix,
    suffix,
    <ReactSelect
      {...{ 'data-test-id': dataTestId }}
      className={`mn-input ${className || ''}`}
      isMulti={false}
      options={options}
      value={options.find((opt) => opt.value === value)}
      onChange={(newValue) => newValue && onChange(newValue.value)}
      placeholder={placeholder}
    />
  );

type MultiSelectProps = InputProps<string[]> & WithDataTestId & OptionsProps;
const MultiSelect = ({
  className,
  value,
  options,
  onChange,
  placeholder,
  'data-test-id': dataTestId,
  prefix,
  suffix,
}: MultiSelectProps) =>
  InputContainer(
    prefix,
    suffix,
    <ReactSelect
      {...{ 'data-test-id': dataTestId }}
      className={`mn-input ${className || ''}`}
      isMulti={true}
      options={options}
      value={value.map((val) => options.find((opt) => opt.value === val))}
      onChange={(newValue) => onChange(newValue.map((option) => option?.value || '').filter((val) => val !== ''))}
      placeholder={placeholder}
    />
  );

export { Select as default, MultiSelect };
