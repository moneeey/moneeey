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
};

type AddonType = string | ReactNode | undefined;

export const InputContainer = (prefix: AddonType, suffix: AddonType, input: ReactNode) => (
  <div className='mn-input-container'>
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
  prefix,
  suffix,
}: InputProps<string>) =>
  InputContainer(
    prefix,
    suffix,
    <input
      {...{ 'data-test-id': dataTestId }}
      type='text'
      className={`mn-input ${className || ''}`}
      value={value}
      onChange={({ target: { value: newValue } }) => onChange(newValue)}
      placeholder={placeholder}
    />
  );

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
}: InputNumberProps) =>
  InputContainer(
    prefix,
    suffix,
    <input
      {...{ 'data-test-id': dataTestId }}
      type='number'
      className={`mn-input ${className || ''}`}
      value={`${value}`}
      onChange={({ target: { value: newValue } }) => onChange(parseInt(newValue, 10))}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
    />
  );

const TextArea = ({
  className,
  value,
  onChange,
  placeholder,
  'data-test-id': dataTestId,
  prefix,
  suffix,
}: InputProps<string>) =>
  InputContainer(
    prefix,
    suffix,
    <textarea
      {...{ 'data-test-id': dataTestId }}
      className={`mn-input ${className || ''}`}
      value={value}
      onChange={({ target: { value: newValue } }) => onChange(newValue)}
      placeholder={placeholder}
    />
  );

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
}: CheckboxProps) =>
  InputContainer(
    prefix,
    suffix || children,
    <input
      {...{ 'data-test-id': dataTestId }}
      type='checkbox'
      className={`mn-input-checkbox ${className || ''}`}
      checked={value}
      onChange={({ target: { checked: newValue } }) => onChange(newValue)}
      placeholder={placeholder}
    />
  );

export { Input, InputNumber, TextArea, Checkbox };
