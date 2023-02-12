import { ReactNode } from 'react';
import ReactSelect from 'react-select';
import CreatableReactSelect from 'react-select/creatable';

import { WithDataTestId } from './Common';
import { InputContainer, InputProps } from './Input';

import './Select.less';

type Option = {
  label: string | ReactNode;
  value: string;
};

type BaseSelectProps = {
  options: Option[];
  onCreate?: (name: string) => void;
  creatable?: boolean;
};

type SelectProps = InputProps<string> & WithDataTestId & BaseSelectProps;

const Select = ({
  className,
  value,
  options,
  onChange,
  placeholder,
  'data-test-id': dataTestId,
  disabled,
  readOnly,
  prefix,
  suffix,
  isError,
  onCreate,
}: SelectProps) => {
  const SelectComponent = onCreate ? CreatableReactSelect : ReactSelect;

  return InputContainer({
    prefix,
    suffix,
    isError,
    input: (
      <SelectComponent
        className={`mn-input mn-select ${className || ''} ${dataTestId}`}
        classNamePrefix={'react-select'}
        menuPlacement='auto'
        isMulti={false}
        options={options}
        value={options.find((opt) => opt.value === value)}
        onChange={(newValue) => newValue && onChange(newValue.value)}
        onCreateOption={(name) => onCreate && onCreate(name)}
        placeholder={placeholder}
        isDisabled={disabled || readOnly}
      />
    ),
  });
};

type MultiSelectProps = InputProps<string[]> & WithDataTestId & BaseSelectProps;
const MultiSelect = ({
  className,
  value,
  options,
  onChange,
  placeholder,
  'data-test-id': dataTestId,
  disabled,
  readOnly,
  prefix,
  suffix,
  isError,
  onCreate,
}: MultiSelectProps) => {
  const SelectComponent = onCreate ? CreatableReactSelect : ReactSelect;

  return InputContainer({
    prefix,
    suffix,
    isError,
    input: (
      <SelectComponent
        className={`mn-input mn-select ${className || ''} ${dataTestId}`}
        classNamePrefix={'react-select'}
        menuPlacement='auto'
        isMulti={true}
        options={options}
        value={(value || []).map((val) => options.find((opt) => opt.value === val))}
        onChange={(newValue) => onChange(newValue.map((option) => option?.value || '').filter((val) => val !== ''))}
        onCreateOption={(name) => onCreate && onCreate(name)}
        placeholder={placeholder}
        isDisabled={disabled || readOnly}
      />
    ),
  });
};

export { Select as default, MultiSelect };
