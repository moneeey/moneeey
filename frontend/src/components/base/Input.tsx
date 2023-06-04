import { ReactNode, useEffect, useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { ClassNameType } from '../../utils/Utils';

import { WithDataTestId } from './Common';

export const BaseInputClzz: ClassNameType = 'w-full color-white bg-background-800';

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
  <div className={`${BaseInputClzz} flex ${isError ? 'text-red-400' : ''}`}>
    {prefix}
    <div className='grow'>{input}</div>
    {suffix}
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
}: InputProps<string>) => {
  const [currentValue, setCurrentValue] = useState<string>(value);

  useEffect(() => {
    return () => {
      if (currentValue !== value) {
        onChange(currentValue);
      }
    };
  }, []);

  return InputContainer({
    prefix,
    suffix,
    isError,
    input: (
      <input
        {...{ 'data-test-id': dataTestId }}
        type='text'
        className={`${BaseInputClzz} ${className || ''}`}
        value={currentValue}
        onChange={({ target: { value: newValue } }) => setCurrentValue(newValue)}
        onBlur={() => onChange(currentValue)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
      />
    ),
  });
};

type InputNumberProps = InputProps<number> & {
  thousandSeparator: string;
  decimalSeparator: string;
  decimalScale: number;
};

const InputNumber = ({
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
  thousandSeparator,
  decimalSeparator,
  decimalScale,
}: InputNumberProps) => {
  const [currentValue, setCurrentValue] = useState<string | number>(value);
  const [currentFloatValue, setCurrentFloatValue] = useState<number | null>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (currentFloatValue && currentFloatValue !== value) {
        onChange(currentFloatValue);
      }
    };
  }, []);

  return InputContainer({
    prefix,
    suffix,
    isError,
    input: (
      <NumericFormat
        {...{ 'data-test-id': dataTestId }}
        className={`${BaseInputClzz} font-mono ${className || ''}`}
        value={currentValue}
        onValueChange={({ floatValue, formattedValue }) => {
          if (formattedValue) {
            setCurrentValue(formattedValue);
          }
          if (floatValue && floatValue !== value) {
            setCurrentFloatValue(floatValue);
          }
        }}
        onBlur={() => currentFloatValue !== null && onChange(currentFloatValue)}
        placeholder={placeholder}
        thousandsGroupStyle='thousand'
        thousandSeparator={thousandSeparator}
        decimalSeparator={decimalSeparator}
        decimalScale={decimalScale}
        disabled={disabled}
        readOnly={readOnly}
      />
    ),
  });
};

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
  rows,
}: InputProps<string> & { rows?: number }) =>
  InputContainer({
    prefix,
    suffix,
    isError,
    input: (
      <textarea
        {...{ 'data-test-id': dataTestId }}
        className={`${BaseInputClzz} ${className || ''}`}
        value={value}
        onChange={({ target: { value: newValue } }) => onChange(newValue)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        rows={rows}
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
        className={`${className || ''}`}
        checked={value}
        onChange={({ target: { checked: newValue } }) => onChange(newValue)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
      />
    ),
  });

export { Input, InputNumber, TextArea, Checkbox };
