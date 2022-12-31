import { ReactNode } from 'react';

import { WithDataTestId } from './Common';

import './Input.less';

export type InputProps<T> = WithDataTestId & {
  className?: string;
  onChange: (value: T) => void;
  value: T;
  placeholder: string;
  prefix?: string | ReactNode;
  suffix?: string | ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  isError?: boolean;
};

type AddonType = string | ReactNode | undefined;
type InputContainerProps = {
  prefix: AddonType;
  suffix: AddonType;
  isError: boolean | undefined;
  input: ReactNode;
};

export const InputContainer = ({ prefix, suffix, isError, input }: InputContainerProps) => (
  <div className={`mn-input-container ${isError ? 'error' : ''}`}>
    {prefix && <div className='mn-input-prefix'>{prefix}</div>}
    {input}
    {suffix && <div className='mn-input-suffix'>{suffix}</div>}
  </div>
);

const Input = ({
  className,
  value,
  onChange,
  placeholder,
  'data-test-id': dataTestId,
  disabled,
  readOnly,
  prefix,
  suffix,
  isError,
}: InputProps<string>) =>
  InputContainer({
    prefix,
    suffix,
    isError,
    input: (
      <input
        {...{ 'data-test-id': dataTestId }}
        type='text'
        className={`mn-input ${className || ''}`}
        value={value}
        onChange={({ target: { value: newValue } }) => onChange(newValue)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
      />
    ),
  });

type InputNumberProps = InputProps<number> & {
  step: number;
  max: number;
  min: number;
};

const InputNumber = ({
  className,
  value,
  onChange,
  placeholder,
  'data-test-id': dataTestId,
  prefix,
  suffix,
  min,
  max,
  step,
  disabled,
  readOnly,
  isError,
}: InputNumberProps) =>
  InputContainer({
    prefix,
    suffix,
    isError,
    input: (
      <input
        {...{ 'data-test-id': dataTestId }}
        type='number'
        className={`mn-input ${className || ''}`}
        value={`${value}`}
        onChange={({ target: { value: newValue } }) => onChange(parseFloat(newValue))}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        readOnly={readOnly}
      />
    ),
  });

const TextArea = ({
  className,
  value,
  onChange,
  placeholder,
  'data-test-id': dataTestId,
  prefix,
  suffix,
  disabled,
  readOnly,
  isError,
}: InputProps<string>) =>
  InputContainer({
    prefix,
    suffix,
    isError,
    input: (
      <textarea
        {...{ 'data-test-id': dataTestId }}
        className={`mn-input ${className || ''}`}
        value={value}
        onChange={({ target: { value: newValue } }) => onChange(newValue)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
      />
    ),
  });

type CheckboxProps = InputProps<boolean> & {
  children: string | ReactNode;
};

const Checkbox = ({
  className,
  value,
  onChange,
  placeholder,
  'data-test-id': dataTestId,
  children,
  prefix,
  suffix,
  disabled,
  readOnly,
  isError,
}: CheckboxProps) =>
  InputContainer({
    prefix,
    suffix: suffix || children,
    isError,
    input: (
      <input
        {...{ 'data-test-id': dataTestId }}
        type='checkbox'
        className={`mn-input-checkbox ${className || ''}`}
        checked={value}
        onChange={({ target: { checked: newValue } }) => onChange(newValue)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
      />
    ),
  });

export { Input, InputNumber, TextArea, Checkbox };
